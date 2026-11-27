/**
 * @fileoverview Proactive Rate Pacer - Never Hit Rate Limits
 *
 * Environment-agnostic version (no Node.js dependencies).
 *
 * Calculates sustainable batch sizes and delays from the server-advertised
 * rate-limit window. When the advertised window matches Bluesky's standard
 * repository CREATE budget, the pacer also honours the paired daily budget so
 * a long-running import does not exhaust the 24-hour bucket while staying
 * comfortably below the hourly bucket.
 */

/** Rate pacing calculation result. */
export interface PacingCalculation {
  /** Recommended delay in milliseconds before next batch. */
  delayMs: number;

  /** Target sustainable rate (records/second). */
  sustainableRate: number;

  /** Percentage of maximum rate being used (0-100). */
  utilizationPercent: number;

  /** Human-readable explanation. */
  reason: string;
}

export interface RateWindow {
  limit: number;
  windowSeconds: number;
  remaining: number;
  inferred: boolean;
}

/**
 * Bluesky's standard per-DID repository write budgets. A CREATE costs three
 * points, so both windows apply to a history import at the same time.
 *
 * Other PDS providers may use different limits. We therefore infer the paired
 * daily window only when the server-advertised policy exactly matches one of
 * these standard write windows and the caller's points-per-record cost is
 * consistent with a CREATE bucket.
 */
const STANDARD_REPO_WRITE_WINDOWS = [
  { limit: 5_000, windowSeconds: 3_600 },
  { limit: 35_000, windowSeconds: 86_400 },
] as const;

const CREATE_POINTS_PER_RECORD = 3;
const CREATE_COST_TOLERANCE = 0.25;

/**
 * Return the tightest pacing window that applies to a repository CREATE.
 *
 * Rate-limit responses commonly expose only the currently relevant window.
 * For Bluesky's standard write policy that is not enough for a long import:
 * pacing at 5,000 points/hour can still consume the separate 35,000-point
 * daily budget in roughly seven hours. Once the reported policy looks like
 * the standard CREATE bucket, include the paired daily window and pace against
 * whichever policy has the lower sustainable points/second rate.
 *
 * The current server window always retains its real `remaining` value. An
 * inferred companion window starts at its full capacity because the server
 * has not exposed its current remainder; any pre-existing usage is still
 * caught safely by the existing reactive 429 path.
 */
export function getEffectiveRepoWriteWindow(
  serverLimit: number,
  windowSeconds: number,
  currentRemaining: number,
  pointsPerRecord: number,
): RateWindow {
  const current: RateWindow = {
    limit: serverLimit,
    windowSeconds,
    remaining: currentRemaining,
    inferred: false,
  };

  const looksLikeCreateBucket =
    Math.abs(pointsPerRecord - CREATE_POINTS_PER_RECORD) <= CREATE_COST_TOLERANCE;
  const matchesStandardWriteWindow = STANDARD_REPO_WRITE_WINDOWS.some(
    (window) => window.limit === serverLimit && window.windowSeconds === windowSeconds,
  );

  if (!looksLikeCreateBucket || !matchesStandardWriteWindow) return current;

  let tightest = current;
  for (const window of STANDARD_REPO_WRITE_WINDOWS) {
    const candidateRate = window.limit / window.windowSeconds;
    const tightestRate = tightest.limit / tightest.windowSeconds;
    if (candidateRate < tightestRate) {
      tightest = {
        limit: window.limit,
        windowSeconds: window.windowSeconds,
        remaining: window.limit,
        inferred: true,
      };
    }
  }

  return tightest;
}

/** Fraction of each window left untouched so the account can still write elsewhere. */
export const QUOTA_RESERVE = 0.15;

/** Delay between batches when the whole remaining import fits in available quota. */
const BURST_DELAY_MS = 500;

/**
 * Decide how hard an import needs pacing, given how much of it is left.
 *
 * Pacing exists to stop a large import exhausting a quota; work that fits in
 * the quota already available gains nothing from being drip-fed.
 *
 * - `burst`: everything left fits in the current window above the reserve.
 * - otherwise, if everything left fits in the standard daily budget above the
 *   reserve, only the server-advertised window applies. Should the daily bucket
 *   become the tightest one, the server reports it and it is paced directly.
 * - otherwise the inferred daily window applies too.
 *
 * Without `remainingRecords` nothing is assumed about the size of the job.
 */
export function resolvePacingWindow(
  serverLimit: number,
  windowSeconds: number,
  currentRemaining: number,
  pointsPerRecord: number,
  remainingRecords?: number,
): { window: RateWindow; burst: boolean } {
  const window = getEffectiveRepoWriteWindow(serverLimit, windowSeconds, currentRemaining, pointsPerRecord);
  if (remainingRecords === undefined) return { window, burst: false };

  const pointsLeft = remainingRecords * pointsPerRecord;
  const current: RateWindow = { limit: serverLimit, windowSeconds, remaining: currentRemaining, inferred: false };
  if (pointsLeft <= currentRemaining - serverLimit * QUOTA_RESERVE) return { window: current, burst: true };
  if (window.inferred && pointsLeft <= window.limit * (1 - QUOTA_RESERVE)) return { window: current, burst: false };
  return { window, burst: false };
}

/** Calculate optimal delays and batch sizes for sustainable imports. */
export class ProactiveRatePacer {
  /**
   * Starting points-per-record assumption. Callers that can observe the actual
   * quota delta should pass that empirical value instead.
   */
  private readonly DEFAULT_POINTS_PER_RECORD = 3;

  /** Target utilization of maximum rate (80% = comfortable margin). */
  private readonly TARGET_UTILIZATION = 0.80;

  /** Minimum delay between batches (ms) - prevents hammering. */
  private readonly MIN_DELAY_MS = 100;

  /** Maximum delay between batches (ms) - prevents excessive waiting. */
  private readonly MAX_DELAY_MS = 300000; // 5 minutes

  /**
   * Calculate optimal delay before the next batch.
   */
  calculateDelay(
    batchSize: number,
    serverLimit: number,
    windowSeconds: number,
    currentRemaining: number,
    pointsPerRecord: number = this.DEFAULT_POINTS_PER_RECORD,
    remainingRecords?: number
  ): PacingCalculation {
    const { window, burst } = resolvePacingWindow(
      serverLimit,
      windowSeconds,
      currentRemaining,
      pointsPerRecord,
      remainingRecords,
    );
    if (burst) {
      return {
        delayMs: BURST_DELAY_MS,
        sustainableRate: batchSize / (BURST_DELAY_MS / 1000),
        utilizationPercent: 100,
        reason: 'Remaining records fit in the available quota',
      };
    }

    const pointsPerSecond = window.limit / window.windowSeconds;
    const maxRecordsPerSecond = pointsPerSecond / pointsPerRecord;
    const quotaHealthPercent = (window.remaining / window.limit) * 100;

    let targetUtilization = this.TARGET_UTILIZATION;
    let reason = `Target rate: ${(targetUtilization * 100).toFixed(0)}% of maximum`;

    if (quotaHealthPercent < 5) {
      targetUtilization = 0.05;
      reason = `Critical (${quotaHealthPercent.toFixed(1)}% quota): 5% rate, allowing rebuild`;
    } else if (quotaHealthPercent < 15) {
      targetUtilization = 0.10;
      reason = `Very low (${quotaHealthPercent.toFixed(1)}% quota): 10% rate to rebuild`;
    } else if (quotaHealthPercent < 30) {
      targetUtilization = 0.40;
      reason = `Low quota (${quotaHealthPercent.toFixed(0)}%): conservative 40% rate`;
    } else if (quotaHealthPercent < 60) {
      targetUtilization = 0.60;
      reason = `Medium quota (${quotaHealthPercent.toFixed(0)}%): moderate 60% rate`;
    }

    if (window.inferred) {
      reason += `; bounded by ${window.limit.toLocaleString()} pts/${window.windowSeconds}s write policy`;
    }

    const sustainableRecordsPerSecond = maxRecordsPerSecond * targetUtilization;
    const idealBatchDurationSeconds = batchSize / sustainableRecordsPerSecond;
    let delayMs = Math.floor(idealBatchDurationSeconds * 1000);
    delayMs = Math.max(this.MIN_DELAY_MS, Math.min(delayMs, this.MAX_DELAY_MS));

    return {
      delayMs,
      sustainableRate: sustainableRecordsPerSecond,
      utilizationPercent: targetUtilization * 100,
      reason,
    };
  }

  /**
   * Calculate an optimal batch size for current conditions.
   */
  calculateOptimalBatchSize(
    serverLimit: number,
    windowSeconds: number,
    currentRemaining: number,
    maxBatchSize: number = 200,
    pointsPerRecord: number = this.DEFAULT_POINTS_PER_RECORD,
    remainingRecords?: number
  ): number {
    const { window, burst } = resolvePacingWindow(
      serverLimit,
      windowSeconds,
      currentRemaining,
      pointsPerRecord,
      remainingRecords,
    );
    if (burst) return Math.max(1, Math.min(remainingRecords!, maxBatchSize));

    const pointsPerSecond = window.limit / window.windowSeconds;
    const maxRecordsPerSecond = pointsPerSecond / pointsPerRecord;
    const quotaHealthPercent = (window.remaining / window.limit) * 100;
    let targetUtilization = this.TARGET_UTILIZATION;

    if (quotaHealthPercent < 5) {
      const criticalSize = Math.max(
        1,
        Math.min(10, Math.floor(window.remaining / pointsPerRecord)),
      );
      return criticalSize;
    } else if (quotaHealthPercent < 15) {
      targetUtilization = 0.10;
      const lowSize = Math.max(
        10,
        Math.min(20, Math.floor(window.remaining / pointsPerRecord)),
      );
      return lowSize;
    } else if (quotaHealthPercent < 30) {
      targetUtilization = 0.40;
    } else if (quotaHealthPercent < 60) {
      targetUtilization = 0.60;
    }

    const sustainableRecordsPerSecond = maxRecordsPerSecond * targetUtilization;
    const targetBatchDurationSeconds = 45;
    const optimalSize = Math.floor(sustainableRecordsPerSecond * targetBatchDurationSeconds);

    return Math.max(1, Math.min(optimalSize, maxBatchSize));
  }

  /**
   * Estimate time to completion at the sustainable rate.
   */
  estimateTimeToCompletion(
    remainingRecords: number,
    serverLimit: number,
    windowSeconds: number,
    currentQuota: number,
    pointsPerRecord: number = this.DEFAULT_POINTS_PER_RECORD
  ): number {
    const { window, burst } = resolvePacingWindow(
      serverLimit,
      windowSeconds,
      currentQuota,
      pointsPerRecord,
      remainingRecords,
    );
    // Roughly a second per full batch.
    if (burst) return Math.ceil(remainingRecords / 200);

    const pointsPerSecond = window.limit / window.windowSeconds;
    const maxRecordsPerSecond = pointsPerSecond / pointsPerRecord;
    const quotaHealthPercent = (window.remaining / window.limit) * 100;
    let avgUtilization = this.TARGET_UTILIZATION;

    if (quotaHealthPercent < 30) {
      avgUtilization = 0.40;
    } else if (quotaHealthPercent < 60) {
      avgUtilization = 0.60;
    }

    const sustainableRecordsPerSecond = maxRecordsPerSecond * avgUtilization;
    return remainingRecords / sustainableRecordsPerSecond;
  }

  /**
   * Calculate buffer time needed before quota can cover the next batch.
   * This method deals in raw points and therefore uses the explicitly supplied
   * server window rather than inferring a record-write companion window.
   */
  calculateRecoveryWaitTime(
    pointsNeeded: number,
    currentRemaining: number,
    serverLimit: number,
    windowSeconds: number
  ): number {
    if (currentRemaining >= pointsNeeded) return 0;

    const pointsToRecover = pointsNeeded - currentRemaining;
    const pointsPerSecond = serverLimit / windowSeconds;
    return Math.ceil(pointsToRecover / pointsPerSecond);
  }
}
