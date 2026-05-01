/**
 * ATProto record publisher — environment-agnostic.
 * Converts MicroblogPost[] into app.bsky.feed.post records and publishes
 * them via com.atproto.repo.applyWrites with rate-limit-aware batching.
 */

import type { Agent } from '@atproto/api';
import type { MicroblogPost, Facet } from './types.js';
import { RateLimiter } from './rate-limiter.js';
import { normalizeHeaders, isRateLimitError } from './rate-limit-headers.js';

const RECORD_TYPE = 'app.bsky.feed.post';
const MAX_PDS_BATCH_SIZE = 50;
const POINTS_PER_RECORD = 1;

export interface PublishProgress {
  batchIndex: number;
  totalBatches: number;
  recordsProcessed: number;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  currentBatchSize: number;
  message: string;
}

export interface PublisherCallbacks {
  onProgress: (p: PublishProgress) => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error' | 'progress', msg: string) => void;
  isCancelled: () => boolean;
}

function cancellableSleep(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const end = Date.now() + ms;
    const tick = () => {
      if (isCancelled() || Date.now() >= end) { resolve(); return; }
      setTimeout(tick, Math.min(50, end - Date.now()));
    };
    tick();
  });
}

function extractHeaders(response: unknown): Record<string, string> {
  const headers: Record<string, string> = {};
  const r = response as any;
  if (r?.headers) {
    if (typeof r.headers.forEach === 'function') {
      r.headers.forEach((v: string, k: string) => { headers[k] = v; });
    } else {
      Object.assign(headers, r.headers);
    }
  }
  return headers;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  onRetry?: (attempt: number, err: Error) => void,
): Promise<T> {
  let lastErr!: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err as Error;
      const isTransient = /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|network|timeout|503|502|504/i.test(lastErr.message ?? '');
      if (!isTransient || attempt === maxAttempts) throw lastErr;
      onRetry?.(attempt, lastErr);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr;
}

/**
 * Convert a MicroblogPost into an app.bsky.feed.post record value.
 */
function toPostRecord(post: MicroblogPost): Record<string, unknown> {
  const record: Record<string, unknown> = {
    $type: RECORD_TYPE,
    text: post.text,
    createdAt: post.createdAt,
  };

  if (post.facets && post.facets.length > 0) {
    record.facets = post.facets.map((f: Facet) => ({
      index: f.index,
      features: f.features,
    }));
  }

  // Reply reference — if the reply target is a Bluesky post URI
  if (post.replyTo?.startsWith('at://')) {
    record.reply = {
      root: { uri: post.replyTo, cid: '' }, // CID resolved at publish time
      parent: { uri: post.replyTo, cid: '' },
    };
  }

  return record;
}

export async function publishRecords(
  agent: Agent,
  posts: MicroblogPost[],
  dryRun: boolean,
  callbacks: PublisherCallbacks,
): Promise<{ successCount: number; errorCount: number; cancelled: boolean }> {
  const { onProgress, onLog, isCancelled } = callbacks;
  const total = posts.length;

  if (dryRun) {
    onLog('info', `[DRY RUN] Would publish ${total.toLocaleString()} posts`);
    posts.slice(0, 5).forEach((p, i) => {
      onLog('info', `  ${i + 1}. ${p.text.slice(0, 60)}${p.text.length > 60 ? '…' : ''} (${p.createdAt.slice(0, 10)})`);
    });
    if (total > 5) onLog('info', `  …and ${total - 5} more`);
    return { successCount: total, errorCount: 0, cancelled: false };
  }

  const ac = new AbortController();
  const cancelPoll = setInterval(() => { if (isCancelled()) ac.abort(); }, 50);

  const rl = new RateLimiter({ headroom: 0.15 });
  let currentBatchSize = 50;
  let currentDelay = 500;
  let successCount = 0;
  let errorCount = 0;
  let batchCounter = 0;
  let i = 0;
  const startTime = Date.now();

  onLog('info', `Publishing ${total.toLocaleString()} posts to ATProto…`);

  try {
    while (i < total) {
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      const batch = posts.slice(i, Math.min(i + currentBatchSize, total));
      batchCounter++;
      const pct = ((i / total) * 100).toFixed(1);

      onProgress({
        batchIndex: batchCounter,
        totalBatches: Math.ceil(total / currentBatchSize),
        recordsProcessed: i,
        totalRecords: total,
        successCount,
        errorCount,
        currentBatchSize: batch.length,
        message: `[${pct}%] Batch ${batchCounter} — posts ${i + 1}–${Math.min(i + batch.length, total)}`,
      });

      const writes = batch.map((post) => ({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: RECORD_TYPE,
        rkey: `opal-${post.platform}-${post.originalId}`,
        value: toPostRecord(post),
      }));

      const batchPoints = batch.length * POINTS_PER_RECORD;
      await rl.waitForPermit(batchPoints, isCancelled);
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      try {
        const response = await withRetry(
          () => agent.com.atproto.repo.applyWrites(
            { repo: agent.did ?? (agent as any).sessionManager?.did ?? '', writes: writes as any },
            { signal: ac.signal },
          ),
          3,
          (attempt, err) => onLog('warn', `Batch ${batchCounter} failed (attempt ${attempt}/3): ${err.message} — retrying…`),
        );

        successCount += (response.data as any).results?.length ?? batch.length;

        const rawHeaders = extractHeaders(response);
        if (Object.keys(rawHeaders).length > 0) {
          const norm = normalizeHeaders(rawHeaders);
          rl.updateFromHeaders(norm);

          if (batchCounter === 1) {
            const cap = rl.getServerCapacity();
            if (cap) {
              const remaining = rl.getActualRemaining();
              const recsPerSec = (cap.limit / cap.windowSeconds / POINTS_PER_RECORD) * 0.8;
              currentBatchSize = Math.min(MAX_PDS_BATCH_SIZE, Math.max(10, Math.floor(recsPerSec * 45)));
              currentDelay = Math.max(500, Math.floor((currentBatchSize / recsPerSec) * 1000));
              onLog('info', `Server: ${cap.limit} pts/${cap.windowSeconds}s — optimised to ${currentBatchSize} posts/batch`);
              onLog('info', `   Remaining quota: ${remaining.toLocaleString()}/${cap.limit.toLocaleString()}`);
            }
          }
        }

        const rps = (successCount / ((Date.now() - startTime) / 1000)).toFixed(1);
        onLog('progress', `Batch ${batchCounter} — ${successCount}/${total} posts (${rps} rec/s)`);
        i += batch.length;
      } catch (err: unknown) {
        const e = err as any;
        if (ac.signal.aborted || isCancelled()) {
          return { successCount, errorCount, cancelled: true };
        }
        if (isRateLimitError(e)) {
          onLog('warn', 'Rate limit hit — waiting for quota reset…');
          const rawErrHeaders: Record<string, string> =
            typeof e?.response?.headers?.forEach === 'function'
              ? (() => { const o: Record<string, string> = {}; e.response.headers.forEach((v: string, k: string) => { o[k] = v; }); return o; })()
              : (e?.response?.headers ?? e?.headers ?? {});
          rl.handleRateLimitHit(normalizeHeaders(rawErrHeaders));
          await rl.waitForPermit(batchPoints, isCancelled);
          continue;
        }
        errorCount += batch.length;
        onLog('error', `Batch ${batchCounter} failed: ${e?.message ?? e}`);
        i += batch.length;
      }

      if (i < total) {
        await cancellableSleep(currentDelay, isCancelled);
      }
    }
  } finally {
    clearInterval(cancelPoll);
  }

  return { successCount, errorCount, cancelled: false };
}
