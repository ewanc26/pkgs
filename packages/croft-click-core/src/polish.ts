/**
 * Teal migration polish — environment-agnostic.
 *
 * Moves legacy `fm.teal.alpha.feed.play` scrobbles into the production
 * `fm.teal.feed.play` collection, then cleans up the legacy copies.
 * No CLI UI or caching; those are added by the CLI wrapper (src/lib/polish.ts
 * in malachite) and by malachite-web.
 */

import type { Agent } from '@atproto/api';
import { RECORD_TYPE, LEGACY_RECORD_TYPE } from './config.js';
import { fetchRepoViaCAR, getPdsUrlFromAgent, getAgentToken } from './car-fetch.js';
import { retryWithBackoff } from './retry-helper.js';
import { RateLimiter } from './rate-limiter.js';
import { ProactiveRatePacer } from './proactive-rate-pacer.js';
import { isRateLimitError, normalizeHeaders } from './rate-limit-headers.js';

export interface PolishRecord {
  rkey: string;
  uri: string;
  cid: string;
  value: Record<string, unknown>;
}

export interface PolishPlan {
  productionTotal: number;
  legacyTotal: number;
  /** Alpha records with no production counterpart — need to be backfilled. */
  toBackfill: PolishRecord[];
  /** Alpha records whose rkey already exists in production — drop the alpha copy. */
  toDedupe: PolishRecord[];
}

export interface PolishResult {
  backfilled: number;
  deduped: number;
  deleted: number;
  failed: number;
}

export type PolishPhase = 'backfill' | 'delete';

export interface PolishMigrateOptions {
  dryRun?: boolean;
  /** Called after each record is processed: (phase, done, total). */
  onProgress?: (phase: PolishPhase, done: number, total: number) => void;
  signal?: AbortSignal;
}

const POINTS_PER_RECORD = 3;
const MAX_WRITES_PER_BATCH = 200;

/** Extract DID from any agent shape (credential session or OAuth session manager). */
function getDid(agent: Agent): string | undefined {
  return agent.did ?? (agent as any).sessionManager?.did;
}

function collectionFromUri(uri: string): string {
  return uri.split('/').slice(3, -1).join('/');
}

function asPolishRecord(rec: { rkey: string; uri: string; cid: string; value: unknown }): PolishRecord {
  return {
    rkey: rec.rkey,
    uri: rec.uri,
    cid: rec.cid,
    value: (rec.value ?? {}) as Record<string, unknown>,
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Aborted'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Build a migration plan from raw CAR record lists. Pure and unit-testable.
 * Deduplication is rkey-based, prioritizing the production namespace.
 */
export function buildPolishPlan(
  legacy: { rkey: string; uri: string; cid: string; value: unknown }[],
  production: { rkey: string; uri: string; cid: string; value: unknown }[]
): PolishPlan {
  const productionRkeys = new Set(production.map((rec) => rec.rkey));

  const toBackfill: PolishRecord[] = [];
  const toDedupe: PolishRecord[] = [];

  for (const rec of legacy) {
    const record = asPolishRecord(rec);
    if (productionRkeys.has(record.rkey)) {
      toDedupe.push(record);
    } else {
      toBackfill.push(record);
    }
  }

  return {
    productionTotal: production.length,
    legacyTotal: legacy.length,
    toBackfill,
    toDedupe,
  };
}

/**
 * Fetch both collections via CAR and build a migration plan.
 * Read-only — performs no writes.
 */
export async function analyzeLegacyRecords(agent: Agent, signal?: AbortSignal): Promise<PolishPlan> {
  const did = getDid(agent);
  if (!did) throw new Error('No authenticated session');

  signal?.throwIfAborted();

  const pdsUrl = getPdsUrlFromAgent(agent);
  const token = await getAgentToken(agent);

  const [legacy, production] = await Promise.all([
    fetchRepoViaCAR(pdsUrl, did, LEGACY_RECORD_TYPE, signal, token),
    fetchRepoViaCAR(pdsUrl, did, RECORD_TYPE, signal, token),
  ]);

  return buildPolishPlan(legacy, production);
}

/**
 * Execute a migration plan: backfill missing legacy records into the
 * production collection (preserving rkeys), then delete the legacy copies.
 *
 * Uses proactive rate limiting to avoid 429s: batches are paced based on
 * server capacity learned from response headers, and 429 responses trigger
 * a quota drain + wait via the RateLimiter.
 *
 * Backfill failures are reported and their legacy copies are retained so no
 * data is ever lost — re-running polish will finish the job.
 */
export async function migrateLegacyRecords(
  agent: Agent,
  plan: PolishPlan,
  opts: PolishMigrateOptions = {}
): Promise<PolishResult> {
  const did = getDid(agent);
  if (!did) throw new Error('No authenticated session');

  const { dryRun = false, onProgress, signal } = opts;
  signal?.throwIfAborted();

  if (dryRun) {
    return {
      backfilled: plan.toBackfill.length,
      deduped: plan.toDedupe.length,
      deleted: plan.legacyTotal,
      failed: 0,
    };
  }

  const rl = new RateLimiter({ headroom: 0.15 });
  const pacer = new ProactiveRatePacer();

  let backfilled = 0;
  let failed = 0;
  const backfilledRkeys = new Set<string>();

  if (plan.toBackfill.length > 0) {
    for (let i = 0; i < plan.toBackfill.length; i += MAX_WRITES_PER_BATCH) {
      signal?.throwIfAborted();
      const batch = plan.toBackfill.slice(i, i + MAX_WRITES_PER_BATCH);
      const batchPoints = batch.length * POINTS_PER_RECORD;

      await rl.waitForPermit(batchPoints, () => signal?.aborted ?? false);

      const writes = batch.map((record) => ({
        $type: 'com.atproto.repo.applyWrites#create' as const,
        collection: RECORD_TYPE,
        rkey: record.rkey,
        value: { ...record.value, $type: RECORD_TYPE },
      }));

      try {
        const response = await retryWithBackoff(
          async () =>
            await agent.com.atproto.repo.applyWrites(
              {
                repo: did,
                writes: writes as any,
              },
              { signal }
            ),
          {
            maxAttempts: 3,
            initialDelayMs: 1000,
            backoffMultiplier: 2,
            retryableErrors: [
              'fetch failed',
              'ECONNRESET',
              'ETIMEDOUT',
              'ENOTFOUND',
              'ECONNREFUSED',
              'network',
              'socket hang up',
              'timeout',
              '503',
              '502',
              '504',
            ],
          }
        );

        try {
          const respHeaders = (response as any)?.headers as Record<string, string> | undefined;
          if (respHeaders && Object.keys(respHeaders).length > 0) {
            rl.updateFromHeaders(normalizeHeaders(respHeaders));
          }
        } catch {
          // ignore header parse errors
        }

        const results = (response.data.results ?? []) as any[];
        for (let j = 0; j < batch.length; j++) {
          const result = results[j];
          if (result && !('error' in result)) {
            backfilled++;
            backfilledRkeys.add(batch[j].rkey);
          } else {
            failed++;
          }
          onProgress?.('backfill', backfilled + failed, plan.toBackfill.length);
        }
      } catch (err: unknown) {
        if (signal?.aborted) throw err;

        const rateLimitError = isRateLimitError(err);
        if (rateLimitError) {
          const errHeaders = (err as any)?.headers as Record<string, string> | undefined;
          rl.handleRateLimitHit(errHeaders ? normalizeHeaders(errHeaders) : undefined);
          await rl.waitForPermit(batchPoints, () => signal?.aborted ?? false);
          i -= MAX_WRITES_PER_BATCH;
          continue;
        }

        for (let j = 0; j < batch.length; j++) {
          failed++;
          onProgress?.('backfill', backfilled + failed, plan.toBackfill.length);
        }
      }

      if (i + MAX_WRITES_PER_BATCH < plan.toBackfill.length) {
        const cap = rl.getServerCapacity();
        if (cap) {
          const actualQuota = rl.getActualRemaining();
          const pacing = pacer.calculateDelay(batch.length, cap.limit, cap.windowSeconds, actualQuota);
          await sleep(pacing.delayMs, signal);
        }
      }
    }
  }

  const toDelete = [
    ...plan.toDedupe,
    ...plan.toBackfill.filter((record) => backfilledRkeys.has(record.rkey)),
  ];

  let deleted = 0;
  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += MAX_WRITES_PER_BATCH) {
      signal?.throwIfAborted();
      const batch = toDelete.slice(i, i + MAX_WRITES_PER_BATCH);
      const batchPoints = batch.length * POINTS_PER_RECORD;

      await rl.waitForPermit(batchPoints, () => signal?.aborted ?? false);

      const writes = batch.map((record) => ({
        $type: 'com.atproto.repo.applyWrites#delete' as const,
        collection: collectionFromUri(record.uri),
        rkey: record.rkey,
      }));

      try {
        const response = await retryWithBackoff(
          async () =>
            await agent.com.atproto.repo.applyWrites(
              {
                repo: did,
                writes: writes as any,
              },
              { signal }
            ),
          {
            maxAttempts: 3,
            initialDelayMs: 1000,
            backoffMultiplier: 2,
            retryableErrors: [
              'fetch failed',
              'ECONNRESET',
              'ETIMEDOUT',
              'ENOTFOUND',
              'ECONNREFUSED',
              'network',
              'socket hang up',
              'timeout',
              '503',
              '502',
              '504',
            ],
          }
        );

        try {
          const respHeaders = (response as any)?.headers as Record<string, string> | undefined;
          if (respHeaders && Object.keys(respHeaders).length > 0) {
            rl.updateFromHeaders(normalizeHeaders(respHeaders));
          }
        } catch {
          // ignore header parse errors
        }

        const results = (response.data.results ?? []) as any[];
        for (let j = 0; j < batch.length; j++) {
          const result = results[j];
          if (result && !('error' in result)) {
            deleted++;
          }
          onProgress?.('delete', deleted, toDelete.length);
        }
      } catch (err: unknown) {
        if (signal?.aborted) throw err;

        const rateLimitError = isRateLimitError(err);
        if (rateLimitError) {
          const errHeaders = (err as any)?.headers as Record<string, string> | undefined;
          rl.handleRateLimitHit(errHeaders ? normalizeHeaders(errHeaders) : undefined);
          await rl.waitForPermit(batchPoints, () => signal?.aborted ?? false);
          i -= MAX_WRITES_PER_BATCH;
          continue;
        }

        for (let j = 0; j < batch.length; j++) {
          onProgress?.('delete', deleted, toDelete.length);
        }
      }

      if (i + MAX_WRITES_PER_BATCH < toDelete.length) {
        const cap = rl.getServerCapacity();
        if (cap) {
          const actualQuota = rl.getActualRemaining();
          const pacing = pacer.calculateDelay(batch.length, cap.limit, cap.windowSeconds, actualQuota);
          await sleep(pacing.delayMs, signal);
        }
      }
    }
  }

  return { backfilled, deduped: plan.toDedupe.length, deleted, failed };
}
