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

const OP_DELAY_MS = 120;

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

  let backfilled = 0;
  let failed = 0;
  const backfilledRkeys = new Set<string>();

  if (plan.toBackfill.length > 0) {
    for (const record of plan.toBackfill) {
      signal?.throwIfAborted();
      try {
        await agent.com.atproto.repo.createRecord(
          {
            repo: did,
            collection: RECORD_TYPE,
            rkey: record.rkey,
            record: { ...record.value, $type: RECORD_TYPE },
          },
          { signal }
        );
        backfilled++;
        backfilledRkeys.add(record.rkey);
      } catch (err: unknown) {
        if (signal?.aborted) throw err;
        failed++;
      }
      onProgress?.('backfill', backfilled + failed, plan.toBackfill.length);
      await sleep(OP_DELAY_MS, signal);
    }
  }

  const toDelete = [
    ...plan.toDedupe,
    ...plan.toBackfill.filter((record) => backfilledRkeys.has(record.rkey)),
  ];

  let deleted = 0;
  for (const record of toDelete) {
    signal?.throwIfAborted();
    try {
      await agent.com.atproto.repo.deleteRecord(
        {
          repo: did,
          collection: collectionFromUri(record.uri),
          rkey: record.rkey,
        },
        { signal }
      );
      deleted++;
    } catch (err: unknown) {
      if (signal?.aborted) throw err;
      // continue on individual failures
    }
    onProgress?.('delete', deleted, toDelete.length);
    await sleep(OP_DELAY_MS, signal);
  }

  return { backfilled, deduped: plan.toDedupe.length, deleted, failed };
}
