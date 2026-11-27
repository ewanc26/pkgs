/**
 * ATProto record publisher -- environment-agnostic.
 *
 * Uses proactive rate pacing and adaptive batch calculation to maintain
 * sustainable throughput without ever hitting rate limits.
 *
 * All progress/logging is surfaced via callbacks; no console.log or UI deps.
 * The CLI wrapper in src/lib/publisher.ts adapts this to terminal UI.
 */

import type { Client } from '@atproto/lex'
import type { PlayRecord } from './types.js'
import { applyWritesWithHeaders } from './apply-writes.js';
import { RECORD_TYPE, MAX_PDS_BATCH_SIZE, POINTS_PER_RECORD } from './config.js';
import { RateLimiter, type PermitWaitInfo } from './rate-limiter.js';
import { ProactiveRatePacer } from './proactive-rate-pacer.js';
import { estimateImportDuration, formatImportEstimate } from './import-estimate.js';
import { DynamicBatchCalculator } from './dynamic-batch-calculator.js';
import { retryWithBackoff } from './retry-helper.js';
import { generateTIDFromISO } from './tid.js';
import { errorHeaders, isRateLimitError } from './rate-limit-headers.js';
import { sanitizePlayRecordMusicBrainzIds } from './mbid.js';

export interface PublishProgress {
  batchIndex: number;
  totalBatches: number;
  recordsProcessed: number;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  currentBatchSize: number;
  message: string;
  /** Set while the publisher is paused for quota; absent otherwise. */
  waiting?: PermitWaitInfo;
}

export interface PublisherCallbacks {
  onProgress: (p: PublishProgress) => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error' | 'progress', msg: string) => void;
  isCancelled: () => boolean;
  /** Polled during a quota wait; return true once to end the wait and retry. */
  retryNow?: () => boolean;
}

/** Which collection plays are written to, and how each play becomes a record there. */
export interface PublishTarget {
  collection: string;
  toValue: (record: PlayRecord) => unknown;
}

export const TEAL_PUBLISH_TARGET: PublishTarget = {
  collection: RECORD_TYPE,
  toValue: (record) => record,
};

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

/** Human-readable wait duration for limiter waits (e.g. "45s", "12 min", "1.2 h"). */
function formatWaitSeconds(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

export async function publishRecords(
  client: Client,
  records: PlayRecord[],
  dryRun: boolean,
  callbacks: PublisherCallbacks,
  context = 'publish',
  dangerZone = false,
  allowUnresolvedApple = false,
  target: PublishTarget = TEAL_PUBLISH_TARGET
): Promise<{ successCount: number; errorCount: number; cancelled: boolean }> {
  const { onProgress, onLog, isCancelled, retryNow } = callbacks;

  // Preflight every record before dry-run output or the first write. The shared
  // sanitizer also enforces the Apple-import invariant that a play may not be
  // published without a real artist, so a late bad row cannot leave a partially
  // completed import behind.
  records.forEach((record) => { sanitizePlayRecordMusicBrainzIds(record, { allowUnresolvedApple }); });

  const total = records.length;

  if (dryRun) {
    onLog('info', `[DRY RUN] Would publish ${total.toLocaleString()} records`);
    records.slice(0, 5).forEach((r, i) => {
      onLog('info', `  ${i + 1}. ${r.artists?.[0]?.artistName} -- ${r.trackName} (${r.playedTime.slice(0, 10)})`);
    });
    if (total > 5) onLog('info', `  ...and ${total - 5} more`);
    return { successCount: total, errorCount: 0, cancelled: false };
  }

  // Abort controller so in-flight fetches are cancelled immediately on stop.
  const ac = new AbortController();
  const cancelPoll = setInterval(() => { if (isCancelled()) ac.abort(); }, 50);

  const rl = new RateLimiter({ headroom: dangerZone ? 0 : 0.15 });
  const calculator = new DynamicBatchCalculator();
  const pacer = new ProactiveRatePacer();

  if (dangerZone) {
    onLog('warn', '☢️ DANGER ZONE: quota headroom is disabled. This may rate-limit the entire PDS.');
    onLog('warn', '☢️ The PDS still enforces its own limit; only Malachite\'s safety buffer is disabled.');
  }

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
      MAX_PDS_BATCH_SIZE,
      rl.getPointsPerRecord(POINTS_PER_RECORD)
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

      // Surface limiter waits (reason + duration + heartbeat) so the UI shows
      // "waiting for quota" instead of a frozen progress card.
      const emitQuotaWait = (waiting: PermitWaitInfo) => {
        const { reason, totalWaitSeconds, remainingSeconds, resumeAt } = waiting;
        if (remainingSeconds === totalWaitSeconds) {
          onLog('warn', `${reason} -- waiting ${formatWaitSeconds(totalWaitSeconds)}, resuming at ${new Date(resumeAt).toLocaleTimeString()}`);
        }
        onProgress({
          batchIndex: batchCounter,
          totalBatches: Math.ceil(total / currentBatchSize),
          recordsProcessed: i,
          totalRecords: total,
          successCount,
          errorCount,
          currentBatchSize,
          message: `Waiting for rate-limit window -- ${reason} (${formatWaitSeconds(remainingSeconds)} left)`,
          waiting,
        });
      };

      // Sit out any 429 first, so the batch is sized for the quota that follows.
      await rl.waitOutBlock(isCancelled, emitQuotaWait, retryNow);
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
          MAX_PDS_BATCH_SIZE,
          rl.getPointsPerRecord(POINTS_PER_RECORD),
          total - i
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

      const writes = batch.map((record) => ({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: target.collection,
        rkey: generateTIDFromISO(record.playedTime, context),
        value: target.toValue(sanitizePlayRecordMusicBrainzIds(record, { allowUnresolvedApple })),
      }));

      // Gate the batch against the tightest reported bucket using the observed
      // points-per-record rather than the assumed constant. The server reports
      // whichever bucket is currently tightest under the same generic header
      // names; against a request-counted bucket the assumed value wildly
      // overestimates the cost per record and keeps the ledger below the
      // headroom line in phantom-blocking mode.
      const batchPoints = batch.length * rl.getPointsPerRecord(POINTS_PER_RECORD);

      await rl.waitForPermit(batchPoints, isCancelled, emitQuotaWait, retryNow);
      if (isCancelled()) {
        onLog('warn', 'Import cancelled by user.');
        return { successCount, errorCount, cancelled: true };
      }

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

      const batchStartTime = Date.now();

      try {
        const response = await retryWithBackoff(
          () => applyWritesWithHeaders(client,
            { repo: client.assertDid!, writes },
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
        const batchSuccessCount = response.results?.length ?? batch.length;
        successCount += batchSuccessCount;
        const batchDuration = Date.now() - batchStartTime;

        // Record success metrics
        calculator.recordSuccess(batch.length, batchDuration);

        // Learn / update rate limits from response headers (continuous adaptation)
        rl.noteSuccess();
        if (Object.keys(response.headers).length > 0) {
          rl.updateFromHeaders(response.headers, batch.length);

          // After first response, log the learned capacity and recalculate
          if (batchCounter === 1 && rl.hasServerInfo()) {
            const cap = rl.getServerCapacity();
            const remaining = rl.getActualRemaining();
            if (cap) {
              const newBatchSize = pacer.calculateOptimalBatchSize(
                cap.limit,
                cap.windowSeconds,
                remaining,
                MAX_PDS_BATCH_SIZE,
                rl.getPointsPerRecord(POINTS_PER_RECORD),
                total - successCount
              );

              const quotaPercent = ((remaining / cap.limit) * 100).toFixed(1);
              onLog('info', `Learned server capacity: ${cap.limit} pts/${cap.windowSeconds}s`);
              onLog('info', `  Remaining quota: ${remaining}/${cap.limit} (${quotaPercent}%)`);
              onLog('info', `  Optimal batch: ${newBatchSize} records`);

              // Pre-flight duration range. The advertised window is never the
              // whole story for a long import (daily write budgets are not in
              // the headers), so give the honest range and, for imports that
              // will span days, an explicit disclaimer (#94).
              const estimate = estimateImportDuration(
                total - successCount,
                cap.limit,
                cap.windowSeconds,
                rl.getPointsPerRecord(POINTS_PER_RECORD),
                remaining,
              );
              onLog('info', `  Estimated time: ${formatImportEstimate(estimate)}`);
              if (estimate.isLongImport) {
                onLog('warn', `⏳ This import is estimated to take ${formatImportEstimate(estimate)} — hourly write limits are advertised, but daily budgets are not.`);
                onLog('warn', `   Rate limits vary per PDS, so the real duration may land anywhere in that range.`);
                onLog('warn', `   You can stop at any time and resume later; already-published records are skipped on the next run.`);
              }

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
          if (cap && rl.hasObservedPointsPerRecord()) {
            const actualQuota = rl.getActualRemaining();
            const pacing = pacer.calculateDelay(
              currentBatchSize,
              cap.limit,
              cap.windowSeconds,
              actualQuota,
              rl.getPointsPerRecord(POINTS_PER_RECORD),
              total - i
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

        if (ac.signal.aborted || isCancelled()) {
          return { successCount, errorCount, cancelled: true };
        }
        if (isRateLimitError(e)) {
          rl.refund(batchPoints); // this reservation was never actually sent
          rl.handleRateLimitHit(errorHeaders(e));
          batchCounter--; // the retry is the same batch, not a new one
          continue; // the top of the loop sits out the block, then retries
        }
        // Only real failures shrink the batch; a 429 says nothing about its size.
        calculator.recordFailure(batch.length, batchDuration);
        rl.refund(batchPoints); // batch failed before actually costing any quota
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
