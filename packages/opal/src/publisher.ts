/**
 * ATProto record publisher — environment-agnostic.
 * Converts MicroblogPost[] into app.bsky.feed.post records and publishes
 * them via com.atproto.repo.applyWrites with rate-limit-aware throttling.
 */

import type { Agent } from '@atproto/api';
import type { MicroblogPost, Facet } from './types.js';
import { generateTID } from '@ewanc26/tid';
import { RateLimiter } from './rate-limiter.js';
import { normalizeHeaders, isRateLimitError } from './rate-limit-headers.js';

const RECORD_TYPE = 'app.bsky.feed.post';
const POINTS_PER_RECORD = 1;
const MAX_BATCH_SIZE = 50;

export interface PublishProgress {
  recordsProcessed: number;
  totalRecords: number;
  successCount: number;
  errorCount: number;
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
function toPostRecord(
  post: MicroblogPost,
  publishedMap: Map<string, { uri: string; cid: string }>,
): Record<string, unknown> {
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

  const replyTo = resolveRef(post.replyTo, publishedMap);
  const threadRoot = resolveRef(post.threadRoot, publishedMap);

  if (replyTo) {
    record.reply = {
      root: threadRoot ?? replyTo,
      parent: replyTo,
    };
  }

  if (post.langs && post.langs.length > 0) {
    record.langs = post.langs;
  }

  if (post.contentWarning) {
    record.tags = [`cw:${post.contentWarning}`];
  }

  return record;
}

function resolveRef(
  ref: string | undefined,
  publishedMap: Map<string, { uri: string; cid: string }>,
): { uri: string; cid: string } | undefined {
  if (!ref) return undefined;

  if (ref.startsWith('opal-internal:')) {
    const key = ref.replace('opal-internal:', '');
    return publishedMap.get(key);
  }

  if (ref.startsWith('at://')) {
    for (const [, v] of publishedMap) {
      if (v.uri === ref) return v;
    }
    return { uri: ref, cid: '' };
  }

  return undefined;
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
    return { successCount: total, errorCount: 0, cancelled: false };
  }

  const rl = new RateLimiter({ headroom: 0.15 });
  let delay = 500;
  let successCount = 0;
  let errorCount = 0;
  let i = 0;
  const startTime = Date.now();
  const publishedMap = new Map<string, { uri: string; cid: string }>();

  onLog('info', `Publishing ${total.toLocaleString()} posts to ATProto using batch processing…`);

  try {
    while (i < total) {
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      // Batching logic: group posts that don't depend on each other's URIs/CIDs
      // within the same batch.
      const batchPosts: MicroblogPost[] = [];
      while (batchPosts.length < MAX_BATCH_SIZE && i + batchPosts.length < total) {
        const nextPost = posts[i + batchPosts.length];
        
        const dependsOnCurrentBatch = (nextPost.replyTo?.startsWith('opal-internal:') && 
          batchPosts.some(p => `opal-internal:${p.originalId}` === nextPost.replyTo)) ||
          (nextPost.threadRoot?.startsWith('opal-internal:') && 
          batchPosts.some(p => `opal-internal:${p.originalId}` === nextPost.threadRoot));

        if (dependsOnCurrentBatch && batchPosts.length > 0) break;
        
        batchPosts.push(nextPost);
        if (dependsOnCurrentBatch) break; 
      }

      const pct = ((i / total) * 100).toFixed(1);
      onProgress({
        recordsProcessed: i,
        totalRecords: total,
        successCount,
        errorCount,
        message: `[${pct}%] Processing batch of ${batchPosts.length} posts (${i + 1}-${i + batchPosts.length}/${total})`,
      });

      const writes = batchPosts.map(post => ({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: RECORD_TYPE,
        rkey: generateTID(post.createdAt),
        value: toPostRecord(post, publishedMap),
      }));

      const pointsNeeded = batchPosts.length * POINTS_PER_RECORD;
      await rl.waitForPermit(pointsNeeded, isCancelled);
      
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      try {
        const response = await withRetry(
          () => agent.com.atproto.repo.applyWrites({
            repo: agent.did ?? (agent as any).sessionManager?.did ?? '',
            writes: writes as any,
          }),
          3,
          (attempt, err) => onLog('warn', `Batch failed (attempt ${attempt}/3): ${err.message} — retrying…`),
        );

        const results = response.data.results || [];
        batchPosts.forEach((post, idx) => {
          const res = results[idx];
          if (res && (res as any).uri && (res as any).cid) {
            publishedMap.set(post.originalId, { uri: (res as any).uri, cid: (res as any).cid });
          }
        });

        successCount += batchPosts.length;
        i += batchPosts.length;

        const rawHeaders = extractHeaders(response);
        if (Object.keys(rawHeaders).length > 0) {
          rl.updateFromHeaders(normalizeHeaders(rawHeaders));
          const cap = rl.getServerCapacity();
          if (cap) {
            const remaining = rl.getActualRemaining();
            const safeQuota = cap.limit * 0.8;
            if (remaining < safeQuota * 0.2) {
              delay = Math.min(5000, delay + 500);
            } else if (remaining > safeQuota * 0.5) {
              delay = Math.max(100, delay - 100);
            }
          }
        }

        const rps = (successCount / ((Date.now() - startTime) / 1000)).toFixed(1);
        onLog('progress', `${successCount}/${total} posts (${rps} rec/s)`);

      } catch (err: unknown) {
        const e = err as any;
        if (isRateLimitError(e)) {
          onLog('warn', 'Rate limit hit — waiting for quota reset…');
          const rawErrHeaders: Record<string, string> = e?.headers ?? {};
          rl.handleRateLimitHit(normalizeHeaders(rawErrHeaders));
          await rl.waitForPermit(pointsNeeded, isCancelled);
          continue; 
        }
        
        onLog('error', `Batch starting at ${i + 1} failed: ${e?.message ?? e}`);
        errorCount += batchPosts.length;
        i += batchPosts.length;
      }

      if (i < total) {
        await cancellableSleep(delay, isCancelled);
      }
    }
  } finally {
    // Cleanup if needed
  }

  return { successCount, errorCount, cancelled: false };
}
