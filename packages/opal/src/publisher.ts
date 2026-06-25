/**
 * ATProto record publisher — environment-agnostic.
 * Converts MicroblogPost[] into app.bsky.feed.post records and publishes
 * them via com.atproto.repo.applyWrites for batch record creation.
 *
 * Posts are grouped into batches respecting thread dependency ordering:
 * posts that reply to an earlier post must be in a subsequent batch so the
 * parent's AT URI + CID is known when the child record is constructed.
 */

import type { Agent } from '@atproto/api';
import type { MicroblogPost, Facet } from './types.js';
import { generateTID } from '@ewanc26/tid';
import {
  RateLimiter,
  retryWithBackoff,
  normalizeHeaders,
  isRateLimitError,
} from '@ewanc26/croft-click-core';

const RECORD_TYPE = 'app.bsky.feed.post';
const POINTS_PER_RECORD = 1;
const MAX_BATCH_SIZE = 200;

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

/**
 * Check whether a post's thread dependencies are satisfied by already-published
 * posts. A post with no replyTo/threadRoot has no dependencies. Posts that
 * reference at:// URIs are always considered satisfied (CID resolved at publish
 * time).
 */
function dependenciesMet(
  post: MicroblogPost,
  publishedMap: Map<string, { uri: string; cid: string }>,
): boolean {
  if (!post.replyTo && !post.threadRoot) return true;

  // at:// references don't need pre-published mapping
  if (post.replyTo?.startsWith('at://')) return true;
  if (post.threadRoot?.startsWith('at://')) return true;

  if (post.replyTo?.startsWith('opal-internal:')) {
    const key = post.replyTo.replace('opal-internal:', '');
    if (!publishedMap.has(key)) return false;
  }

  if (post.threadRoot?.startsWith('opal-internal:')) {
    const key = post.threadRoot.replace('opal-internal:', '');
    if (!publishedMap.has(key)) return false;
  }

  return true;
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
  let batchCounter = 0;
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

      // Build a batch: collect consecutive posts whose thread dependencies are
      // already satisfied by previously-published posts. Posts that reference
      // opal-internal: targets not yet in publishedMap are deferred to the next
      // batch so the parent's URI+CID is available.
      const batch: { post: MicroblogPost; rkey: string; record: Record<string, unknown> }[] = [];
      while (i < total && batch.length < MAX_BATCH_SIZE && dependenciesMet(posts[i], publishedMap)) {
        const post = posts[i];
        const rkey = generateTID(post.createdAt);
        const record = toPostRecord(post, publishedMap);
        batch.push({ post, rkey, record });
        i++;
      }

      // Edge case: a post's dependency isn't met (shouldn't happen with correct
      // ordering). Force it as a single-post batch so the parent gets published
      // first.
      if (batch.length === 0 && i < total) {
        const post = posts[i];
        const rkey = generateTID(post.createdAt);
        const record = toPostRecord(post, publishedMap);
        batch.push({ post, rkey, record });
        i++;
      }

      batchCounter++;
      const pct = ((successCount / total) * 100).toFixed(1);

      onProgress({
        recordsProcessed: successCount,
        totalRecords: total,
        successCount,
        errorCount,
        message: `[${pct}%] Batch ${batchCounter} — ${batch.length} posts (posts ${successCount + 1}–${Math.min(successCount + batch.length, total)} of ${total})`,
      });

      const writes = batch.map(({ rkey, record }) => ({
        $type: 'com.atproto.repo.applyWrites#create' as const,
        collection: RECORD_TYPE,
        rkey,
        value: record,
      }));

      const batchPoints = batch.length * POINTS_PER_RECORD;

      // Wait for rate-limit quota to be available
      await rl.waitForPermit(batchPoints, isCancelled);
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      try {
        const response = await retryWithBackoff(
          () => agent.com.atproto.repo.applyWrites(
            {
              repo: agent.did ?? (agent as any).sessionManager?.did ?? '',
              writes: writes as any,
            },
            { signal: ac.signal },
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
            onRetry: (attempt, maxAttempts, _delay, error) => {
              onLog('warn', `Batch ${batchCounter} failed (attempt ${attempt}/${maxAttempts}): ${error.message} — retrying…`);
            },
          },
        );

        // Extract results and build publishedMap for thread reference resolution
        const results = (response.data as any)?.results ?? [];
        for (let j = 0; j < Math.min(results.length, batch.length); j++) {
          const result = results[j] as { uri?: string; cid?: string } | undefined;
          if (result?.uri && result?.cid) {
            publishedMap.set(batch[j].post.originalId, { uri: result.uri, cid: result.cid });
          }
        }

        const batchSuccessCount = results.length;
        successCount += batchSuccessCount;

        // Learn / update rate limits from response headers (continuous adaptation)
        const rawHeaders = extractHeaders(response);
        if (Object.keys(rawHeaders).length > 0) {
          rl.updateFromHeaders(normalizeHeaders(rawHeaders));

          // After first batch, log the learned capacity and calculate delay
          if (batchCounter === 1 && rl.hasServerInfo()) {
            const cap = rl.getServerCapacity();
            const remaining = rl.getActualRemaining();
            if (cap) {
              const recsPerSec = (cap.limit / cap.windowSeconds / POINTS_PER_RECORD) * 0.8;
              delay = Math.max(500, Math.floor(1000 / Math.max(recsPerSec, 0.01)));
              onLog('info', `Server: ${cap.limit} pts/${cap.windowSeconds}s — delay ${delay}ms between batches`);
              onLog('info', `   Remaining quota: ${remaining}/${cap.limit}`);
            }
          }
        }

        const rps = (successCount / ((Date.now() - startTime) / 1000)).toFixed(1);
        onLog('progress', `Batch ${batchCounter} — ${successCount}/${total} posts (${rps} rec/s)`);

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
          continue; // retry same batch
        }

        errorCount += batch.length;
        onLog('error', `Batch ${batchCounter} failed: ${e?.message ?? e}`);
      }

      // Wait before next batch
      if (i < total) {
        await cancellableSleep(delay, isCancelled);
      }
    }
  } finally {
    clearInterval(cancelPoll);
  }

  return { successCount, errorCount, cancelled: false };
}
