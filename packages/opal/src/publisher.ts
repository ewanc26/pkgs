/**
 * ATProto record publisher — environment-agnostic.
 * Converts MicroblogPost[] into app.bsky.feed.post records and publishes
 * them via com.atproto.repo.createRecord with rate-limit-aware throttling.
 *
 * Posts are published sequentially (not batched) so that thread references
 * (replyTo, threadRoot) can be resolved to real AT URIs + CIDs. Posts
 * within a split thread must be published in order.
 */

import type { Agent } from '@atproto/api';
import type { MicroblogPost, Facet } from './types.js';
import { RateLimiter } from './rate-limiter.js';
import { normalizeHeaders, isRateLimitError } from './rate-limit-headers.js';

const RECORD_TYPE = 'app.bsky.feed.post';
const POINTS_PER_RECORD = 1;

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
 * Resolves opal-internal: references using the publishedPostMap.
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

  // Resolve reply references
  const replyTo = resolveRef(post.replyTo, publishedMap);
  const threadRoot = resolveRef(post.threadRoot, publishedMap);

  if (replyTo) {
    record.reply = {
      root: threadRoot ?? replyTo,
      parent: replyTo,
    };
  }

  // Language tags
  if (post.langs && post.langs.length > 0) {
    record.langs = post.langs;
  }

  // Content warning tags
  if (post.contentWarning) {
    record.tags = [`cw:${post.contentWarning}`];
  }

  return record;
}

/**
 * Resolve a reference to a { uri, cid } strongRef.
 * Handles opal-internal: refs (split thread continuations) and at:// refs.
 */
function resolveRef(
  ref: string | undefined,
  publishedMap: Map<string, { uri: string; cid: string }>,
): { uri: string; cid: string } | undefined {
  if (!ref) return undefined;

  // opal-internal: references — look up the published post
  if (ref.startsWith('opal-internal:')) {
    const key = ref.replace('opal-internal:', '');
    return publishedMap.get(key);
  }

  // at:// references — we have the URI but need the CID
  if (ref.startsWith('at://')) {
    // Try to find in published map by URI
    for (const [, v] of publishedMap) {
      if (v.uri === ref) return v;
    }
    // Return without CID — the PDS may reject this
    return { uri: ref, cid: '' };
  }

  // Platform-specific references (twitter:status:..., nostr:..., etc.)
  // These can't be resolved to AT URIs — skip the reply ref
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
    posts.slice(0, 5).forEach((p, i) => {
      const threadInfo = p.threadTotal && p.threadTotal > 1
        ? ` [thread ${p.threadIndex}/${p.threadTotal}]`
        : '';
      onLog('info', `  ${i + 1}. ${p.text.slice(0, 60)}${p.text.length > 60 ? '…' : ''}${threadInfo} (${p.createdAt.slice(0, 10)})`);
    });
    if (total > 5) onLog('info', `  …and ${total - 5} more`);
    return { successCount: total, errorCount: 0, cancelled: false };
  }

  const ac = new AbortController();
  const cancelPoll = setInterval(() => { if (isCancelled()) ac.abort(); }, 50);

  const rl = new RateLimiter({ headroom: 0.15 });
  let delay = 500;
  let successCount = 0;
  let errorCount = 0;
  let i = 0;
  const startTime = Date.now();

  // Track all published posts so thread continuations can reference them
  const publishedMap = new Map<string, { uri: string; cid: string }>();

  onLog('info', `Publishing ${total.toLocaleString()} posts to ATProto…`);

  try {
    while (i < total) {
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      const post = posts[i];
      const pct = ((i / total) * 100).toFixed(1);

      onProgress({
        recordsProcessed: i,
        totalRecords: total,
        successCount,
        errorCount,
        message: `[${pct}%] Post ${i + 1}/${total}`,
      });

      const record = toPostRecord(post, publishedMap);
      const rkey = `opal-${post.platform}-${post.originalId}`;

      await rl.waitForPermit(POINTS_PER_RECORD, isCancelled);
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      try {
        const response = await withRetry(
          () => agent.com.atproto.repo.createRecord({
            repo: agent.did ?? (agent as any).sessionManager?.did ?? '',
            collection: RECORD_TYPE,
            rkey,
            record: record as any,
          }, { signal: ac.signal }),
          3,
          (attempt, err) => onLog('warn', `Post ${i + 1} failed (attempt ${attempt}/3): ${err.message} — retrying…`),
        );

        const uri = (response.data as any).uri as string;
        const cid = (response.data as any).cid as string;

        // Store for thread reference resolution
        publishedMap.set(post.originalId, { uri, cid });

        successCount++;

        const rawHeaders = extractHeaders(response);
        if (Object.keys(rawHeaders).length > 0) {
          rl.updateFromHeaders(normalizeHeaders(rawHeaders));

          if (i === 0) {
            const cap = rl.getServerCapacity();
            if (cap) {
              const remaining = rl.getActualRemaining();
              const recsPerSec = (cap.limit / cap.windowSeconds / POINTS_PER_RECORD) * 0.8;
              delay = Math.max(500, Math.floor(1000 / recsPerSec));
              onLog('info', `Server: ${cap.limit} pts/${cap.windowSeconds}s — delay ${delay}ms between posts`);
              onLog('info', `   Remaining quota: ${remaining.toLocaleString()}/${cap.limit.toLocaleString()}`);
            }
          }
        }

        const threadInfo = post.threadTotal && post.threadTotal > 1
          ? ` [${post.threadIndex}/${post.threadTotal}]`
          : '';
        const rps = (successCount / ((Date.now() - startTime) / 1000)).toFixed(1);
        onLog('progress', `${successCount}/${total} posts (${rps} rec/s)${threadInfo}`);

        i++;
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
          await rl.waitForPermit(POINTS_PER_RECORD, isCancelled);
          continue; // retry same post
        }
        errorCount++;
        onLog('error', `Post ${i + 1} failed: ${e?.message ?? e}`);
        i++;
      }

      if (i < total) {
        await cancellableSleep(delay, isCancelled);
      }
    }
  } finally {
    clearInterval(cancelPoll);
  }

  return { successCount, errorCount, cancelled: false };
}
