/**
 * Pre-flight import duration estimates — environment-agnostic.
 *
 * PDS rate-limit headers expose only whichever write bucket is currently
 * tightest — usually the hourly window. The separate daily repository-write
 * budget that the reference PDS (and most other providers) enforce is not
 * advertised in the headers, so an honest estimate for a large import is a
 * *range*, not a point: a best case that paces at the advertised window's
 * refill rate, and a worst case that also assumes the standard 35,000-point
 * daily budget. Neither bound can be known exactly from the start ("we really
 * cannot check how big hourly and daily limits are"), which is why callers
 * should present the range up front and keep updating it from observed
 * throughput once the import is running.
 */

import { QUOTA_RESERVE } from './proactive-rate-pacer.js';

/**
 * Standard repository-write budgets, mirroring the pacer's table. A CREATE
 * costs three points, so both windows apply to a history import at the same
 * time; only the hourly one is usually advertised.
 */
const REFERENCE_DAILY_WINDOW = { points: 35_000, seconds: 86_400 } as const;

/**
 * Sustainable-utilization fraction the pacer targets (80%) — applied to both
 * bounds so the numbers describe an achievable pace rather than a theoretical
 * maximum the importer never actually runs at.
 */
const TARGET_UTILIZATION = 0.8;

/** Imports estimated beyond this many seconds get a long-import disclaimer. */
export const LONG_IMPORT_THRESHOLD_SECONDS = 24 * 60 * 60;

export interface ImportEstimate {
  /** Lower bound: only the server-advertised window applies. */
  bestCaseSeconds: number;
  /**
   * Upper bound: the standard daily write budget also applies. Equals
   * `bestCaseSeconds` when the advertised window already is ~24h long or is
   * itself tighter than the reference daily budget.
   */
  worstCaseSeconds: number;
  /**
   * True when the advertised window is itself a ~daily window, so its refill
   * rate already is the daily truth and the range collapses to a point.
   */
  dailyBudgetKnown: boolean;
  /** True when the worst (or best) case exceeds the long-import threshold. */
  isLongImport: boolean;
}

/**
 * Estimate the duration of importing `records` against a PDS that advertises
 * `serverLimit` points per `windowSeconds`, at `pointsPerRecord` cost per
 * record. Callers that have an empirically observed points-per-record (see
 * `RateLimiter.getPointsPerRecord`) should pass that instead of the assumed
 * default of three.
 */
export function estimateImportDuration(
  records: number,
  serverLimit: number,
  windowSeconds: number,
  pointsPerRecord: number = 3,
  /** Quota left in the advertised window, when known. */
  currentRemaining?: number,
): ImportEstimate {
  if (records <= 0 || serverLimit <= 0 || windowSeconds <= 0 || pointsPerRecord <= 0) {
    return { bestCaseSeconds: 0, worstCaseSeconds: 0, dailyBudgetKnown: true, isLongImport: false };
  }

  const points = records * pointsPerRecord;
  if (currentRemaining !== undefined && points <= currentRemaining - serverLimit * QUOTA_RESERVE) {
    const seconds = Math.ceil(records / 200); // roughly a second per full batch
    return { bestCaseSeconds: seconds, worstCaseSeconds: seconds, dailyBudgetKnown: true, isLongImport: false };
  }
  // Mirrors the pacer: a job that fits the daily budget is not paced against it.
  const fitsDailyBudget =
    currentRemaining !== undefined && points <= REFERENCE_DAILY_WINDOW.points * (1 - QUOTA_RESERVE);

  const refillPointsPerSecond = serverLimit / windowSeconds;
  const dailyPointsPerSecond = REFERENCE_DAILY_WINDOW.points / REFERENCE_DAILY_WINDOW.seconds;

  // A window of ~24h or longer is itself the daily budget: its refill rate
  // already constrains a long import. Shorter (typically hourly) windows say
  // nothing about a separate daily cap, so the honest upper bound assumes the
  // reference daily budget until observed throughput takes over.
  const dailyBudgetKnown = windowSeconds >= REFERENCE_DAILY_WINDOW.seconds;
  const worstPointsPerSecond = dailyBudgetKnown || fitsDailyBudget
    ? refillPointsPerSecond
    : Math.min(refillPointsPerSecond, dailyPointsPerSecond);

  const bestCaseSeconds = points / (refillPointsPerSecond * TARGET_UTILIZATION);
  const worstCaseSeconds = Math.max(
    bestCaseSeconds,
    points / (worstPointsPerSecond * TARGET_UTILIZATION),
  );

  return {
    bestCaseSeconds,
    worstCaseSeconds,
    dailyBudgetKnown,
    isLongImport: worstCaseSeconds > LONG_IMPORT_THRESHOLD_SECONDS,
  };
}

/**
 * Human-readable duration ("45s", "12 min", "1.2 h", "4.6 days") for estimate
 * lines. Environment-agnostic on purpose: the CLI and web render their own
 * detailed stats, this is only for the shared estimate strings.
 */
export function formatDurationWords(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)}s`;
  if (seconds < 90 * 60) return `${Math.round(seconds / 60)} min`;
  const hours = seconds / 3600;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

/**
 * Range for display: a single value when both bounds agree (the advertised
 * window already is the daily truth), otherwise "best – worst".
 */
export function formatImportEstimate(estimate: ImportEstimate): string {
  if (estimate.worstCaseSeconds <= estimate.bestCaseSeconds * 1.05) {
    return `~${formatDurationWords(estimate.bestCaseSeconds)}`;
  }
  return `~${formatDurationWords(estimate.bestCaseSeconds)} – ~${formatDurationWords(estimate.worstCaseSeconds)}`;
}
