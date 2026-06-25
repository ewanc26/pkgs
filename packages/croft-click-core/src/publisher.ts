/**
 * ATProto record publisher -- environment-agnostic.
 *
 * Uses proactive rate pacing and adaptive batch calculation to maintain
 * sustainable throughput without ever hitting rate limits.
 *
 * All progress/logging is surfaced via callbacks; no console.log or UI deps.
 * The CLI wrapper in src/lib/publisher.ts adapts this to terminal UI.
 */

import type { Agent } from '@atproto/api';
import type { PlayRecord } from './types.js';
import { RECORD_TYPE, MAX_PDS_BATCH_SIZE, POINTS_PER_RECORD } from './config.js';
import { RateLimiter } from './rate-limiter.js';
import { ProactiveRatePacer } from './proactive-rate-pacer.js';
import { DynamicBatchCalculator } from './dynamic-batch-calculator.js';
import { retryWithBackoff } from './retry-helper.js';
import { generateTIDFromISO } from './tid.js';
import { normalizeHeaders, isRateLimitError } from './rate-limit-headers.js';

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

export async function publishRecords(
  agent: Agent,
  records: PlayRecord[],
  dryRun: boolean,
  callbacks: PublisherCallbacks,
  context = 'publish'
): Promise<{ successCount: number; errorCount: number; cancelled: boolean }> {
  const { onProgress, onLog, isCancelled } = callbacks;
  const total = records.length;

  if (dryRun) {
    onLog('info', `[DRY RUN] Would publish ${total.toLocaleString()} records`);
    records.slice(0, 5).forEach((r, i) => {
      onLog('info', `  ${i + 1}. ${r.artists[0]?.artistName} -- ${r.trackName} (${r.playedTime.slice(0, 10)})`);
    });
    if (total > 5) onLog('info', `  ...and ${total - 5} more`);
    return { successCount: total, errorCount: 0, cancelled: false };
  }

  // Abort controller so in-flight fetches are cancelled immediately on stop.
  const ac = new AbortController();
  const cancelPoll = setInterval(() => { if (isCancelled()) ac.abort(); }, 50);

  const rl = new RateLimiter({ headroom: 0.15 });
  const calculator = new DynamicBatchCalculator();
  const pacer = new ProactiveRatePacer();

  // Check if we already know server capacity (from previous session cache)
  const serverCapacity = rl.getServerCapacity();
  let currentBatchSize: number;
  let currentDelay: number;

  if (serverCapacity) {
    // We have server info -- calculate optimal batch size right away
    const actualRemaining = rl.getActualRemaining();
    currentBatchSize = pacer.calculateOptimalBatchSize(
      serverCapacity.limit,
      serverCapacity.windowSeconds,
      actualRemaining,
      MAX_PDS_BATCH_SIZE
    );
    currentDelay = 500;
    onLog('info', `Using saved server info: ${serverCapacity.limit} pts/${serverCapacity.windowSeconds}s`);
    onLog('info', `Starting with optimal batch: ${currentBatchSize} records`);
  } else {
    // Smart probe -- 50 records (150 points) is safe for all standard rate limits
    currentBatchSize = 50;
    currentDelay = 500;
    onLog('info', `Probing server capacity with ${currentBatchSize} records (150 points)`);
  }

  let successCount = 0;
  let errorCount = 0;
  let batchCounter = 0;
  let i = 0;
  const startTime = Date.now();

  onLog('info', `Publishing ${total.toLocaleString()} records to ATProto...`);

  try {
    while (i < total) {
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      // Get current server capacity and quota
      const capacity = rl.getServerCapacity();
      const actualRemaining = rl.getActualRemaining();

      if (capacity) {
        // Calculate optimal batch size using the proactive pacer
        const optimalSize = pacer.calculateOptimalBatchSize(
          capacity.limit,
          capacity.windowSeconds,
          actualRemaining,
          MAX_PDS_BATCH_SIZE
        );

        // Apply adaptive scaling from performance metrics
        const adaptiveScale = calculator.calculateAdaptiveScale();
        const scaledSize = Math.floor(optimalSize * adaptiveScale.scale);
        const finalSize = Math.max(1, Math.min(scaledSize, MAX_PDS_BATCH_SIZE));

        // Update batch size if changed significantly
        if (Math.abs(finalSize - currentBatchSize) > 5) {
          onLog('progress', `Batch size: ${currentBatchSize} -> ${finalSize} records`);
          currentBatchSize = finalSize;
        }
      }

      const batch = records.slice(i, Math.min(i + currentBatchSize, total));
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
        message: `[${pct}%] Batch ${batchCounter} -- records ${i + 1}-${Math.min(i + batch.length, total)}`,
      });

      const writes = batch.map((record) => ({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: RECORD_TYPE,
        rkey: generateTIDFromISO(record.playedTime, context),
        value: record,
      }));

      const batchPoints = batch.length * POINTS_PER_RECORD;
      await rl.waitForPermit(batchPoints, isCancelled);
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

      const batchStartTime = Date.now();

      try {
        const response = await retryWithBackoff(
          () => agent.com.atproto.repo.applyWrites(
            { repo: agent.did ?? (agent as any).sessionManager?.did ?? '', writes: writes as any },
            { signal: ac.signal }
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
              onLog('warn', `Batch ${batchCounter} failed (attempt ${attempt}/${maxAttempts}): ${error.message} -- retrying...`);
            },
          }
        );

        // Success!
        const batchSuccessCount = (response.data as any).results?.length ?? batch.length;
        successCount += batchSuccessCount;
        const batchDuration = Date.now() - batchStartTime;

        // Record success metrics
        calculator.recordSuccess(batch.length, batchDuration);

        // Learn / update rate limits from response headers (continuous adaptation)
        const rawHeaders = extractHeaders(response);
        if (Object.keys(rawHeaders).length > 0) {
          const norm = normalizeHeaders(rawHeaders);
          rl.updateFromHeaders(norm);

          // After first response, log the learned capacity and recalculate
          if (batchCounter === 1 && rl.hasServerInfo()) {
            const cap = rl.getServerCapacity();
            const remaining = rl.getActualRemaining();
            if (cap) {
              const newBatchSize = pacer.calculateOptimalBatchSize(
                cap.limit,
                cap.windowSeconds,
                remaining,
                MAX_PDS_BATCH_SIZE
              );

              const quotaPercent = ((remaining / cap.limit) * 100).toFixed(1);
              onLog('info', `Learned server capacity: ${cap.limit} pts/${cap.windowSeconds}s`);
              onLog('info', `  Remaining quota: ${remaining}/${cap.limit} (${quotaPercent}%)`);
              onLog('info', `  Optimal batch: ${newBatchSize} records`);

              currentBatchSize = newBatchSize;
            }
          }
        }

        const rps = (successCount / ((Date.now() - startTime) / 1000)).toFixed(1);
        onLog('progress', `Batch ${batchCounter} -- ${successCount}/${total} records (${rps} rec/s)`);
        i += batch.length;

        // PROACTIVE PACING: Calculate optimal delay for next batch
        if (i < total) {
          const cap = rl.getServerCapacity();
          if (cap) {
            const actualQuota = rl.getActualRemaining();
            const pacing = pacer.calculateDelay(
              currentBatchSize,
              cap.limit,
              cap.windowSeconds,
              actualQuota
            );

            // Update delay if changed significantly
            if (Math.abs(pacing.delayMs - currentDelay) > 200) {
              onLog('progress', `Pacing: ${currentDelay}ms -> ${pacing.delayMs}ms (${pacing.reason})`);
              currentDelay = pacing.delayMs;
            }
          }
        }

      } catch (err: unknown) {
        const e = err as any;
        const batchDuration = Date.now() - batchStartTime;

        // Record failure metrics
        calculator.recordFailure(batch.length, batchDuration);

        if (ac.signal.aborted || isCancelled()) {
          return { successCount, errorCount, cancelled: true };
        }
        if (isRateLimitError(e)) {
          onLog('warn', 'Rate limit hit -- waiting for quota reset...');

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
        i += batch.length;
      }

      // Wait before next batch (proactive pacing)
      if (i < total) {
        await cancellableSleep(currentDelay, isCancelled);
      }
    }
  } finally {
    clearInterval(cancelPoll);
  }

  return { successCount, errorCount, cancelled: false };
}
