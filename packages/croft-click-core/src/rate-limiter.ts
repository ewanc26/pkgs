/**
 * In-memory rate limiter — environment-agnostic.
 * Tracks quota from response headers and gates requests to stay within limits.
 */

import { normalizeHeaders } from './rate-limit-headers.js';

/** Minimum wait after a 429 when the server gave no future reset time. */
const RATE_LIMIT_FALLBACK_WAIT_SECONDS = 60;

/** How often a long wait re-reports progress through `onWait`. */
const WAIT_HEARTBEAT_SECONDS = 30;

/**
 * Longest sleep honoured when the *local ledger* (learned headers minus
 * headroom) says the batch won't fit but the server has not actually sent a
 * 429. The reported bucket may not even be the write-points bucket, so a
 * ledger-only block must never wedge the import for a full window: sleep at
 * most this long, then let the next request's headers re-learn real quota.
 */
const MAX_LEDGER_WAIT_SECONDS = 60;

interface State {
  limit: number;
  remaining: number;
  resetAt: number; // unix seconds
  windowSeconds: number;
}

/**
 * Reported whenever `waitForPermit` decides the caller must wait, and again
 * as a heartbeat during long waits so UIs can show "waiting" instead of a
 * frozen progress card with no explanation.
 */
export interface PermitWaitInfo {
  /** Human-readable reason for the wait. */
  reason: string;
  /** Total wait chosen for this permit, in seconds. */
  totalWaitSeconds: number;
  /** Seconds still to wait (equal to `totalWaitSeconds` on the initial call). */
  remainingSeconds: number;
}

export class RateLimiter {
  private state: State | null = null;
  private readonly headroom: number;
  private readonly maxLedgerWaitSeconds: number;
  /**
   * True from the moment a 429 zeroes the ledger until a successful response
   * (or a genuine window reset) refreshes it. Distinguishes a server-confirmed
   * wait, which must honour the full advertised reset, from a ledger-only
   * block, which may be phantom and gets capped at `maxLedgerWaitSeconds`.
   */
  private exhaustedBy429 = false;

  /**
   * Empirically observed points consumed per record, derived from successive
   * quota readings rather than assumed. The server reports whichever bucket
   * is currently tightest (e.g. a broad per-IP request cap vs. a write-specific
   * points budget) under the same generic header names, with no way to tell
   * which one it is from the headers alone. A hardcoded "points per record"
   * constant is only correct when the reported bucket happens to be the
   * write-specific one; against a request-counted bucket it wildly
   * overestimates cost per record. Tracking the observed delta instead
   * self-corrects regardless of which bucket is being reported.
   */
  private observedPointsPerRecord: number | null = null;
  private lastRemaining: number | null = null;
  private lastResetAt: number | null = null;

  constructor(opts?: { headroom?: number; maxLedgerWaitSeconds?: number }) {
    this.headroom = opts?.headroom ?? 0.15;
    this.maxLedgerWaitSeconds = opts?.maxLedgerWaitSeconds ?? MAX_LEDGER_WAIT_SECONDS;
  }

  /**
   * @param batchSize Number of records the just-completed request covered.
   *   Pass this to let the limiter learn the real points-per-record cost of
   *   whichever bucket the server is reporting; omit for reads/other calls
   *   that shouldn't feed the estimate.
   */
  updateFromHeaders(headers: Record<string, string>, batchSize?: number): void {
    const h = normalizeHeaders(headers);
    const get = (k: string) => h[k] ?? h[`x-${k}`] ?? '';

    const limit = parseInt(get('ratelimit-limit'), 10);
    const remaining = parseInt(get('ratelimit-remaining'), 10);
    const reset = parseInt(get('ratelimit-reset'), 10);
    const policy = get('ratelimit-policy');

    if (!limit || isNaN(limit) || isNaN(remaining)) return;

    let windowSeconds = 3600;
    const m = /;w=(\d+)/.exec(policy);
    if (m) windowSeconds = parseInt(m[1], 10);

    const now = Math.floor(Date.now() / 1000);
    // ratelimit-reset is a delta in seconds per the IETF draft, but some
    // servers send an epoch timestamp instead — in seconds OR milliseconds.
    // Classify by magnitude: 13-digit values are epoch ms, 10-digit values are
    // epoch seconds, smaller values are deltas. An epoch-ms value misread as
    // epoch seconds would land ~55,000 years in the future and silently wedge
    // `waitForPermit` forever.
    let resetAt = isNaN(reset)
      ? now + windowSeconds
      : reset >= 1e12
        ? Math.floor(reset / 1000)
        : reset >= 1_000_000_000
          ? reset
          : now + reset;
    // Defence in depth: clamp implausible far-future resets to one window so a
    // garbage header can never produce an effectively unbounded wait.
    if (resetAt > now + 2 * windowSeconds) {
      resetAt = now + windowSeconds;
    }

    // Only learn from this reading if it's a same-window continuation of the
    // previous one — a window reset (or first-ever reading) makes the delta
    // meaningless, and a jump to a differently-shaped bucket (different
    // limit/window) resets our sample rather than corrupting the average.
    if (
      batchSize &&
      batchSize > 0 &&
      this.state &&
      this.state.limit === limit &&
      this.state.windowSeconds === windowSeconds &&
      this.lastRemaining !== null &&
      this.lastResetAt === resetAt
    ) {
      const consumed = this.lastRemaining - remaining;
      if (consumed > 0) {
        const observed = consumed / batchSize;
        this.observedPointsPerRecord =
          this.observedPointsPerRecord === null
            ? observed
            : this.observedPointsPerRecord * 0.5 + observed * 0.5;
      }
    }

    this.lastRemaining = remaining;
    this.lastResetAt = resetAt;
    // A live response supersedes any previous 429 exhaustion.
    this.exhaustedBy429 = false;
    this.state = { limit, remaining, resetAt, windowSeconds };
  }

  /**
   * Points-per-record cost to use for pacing math: the empirically observed
   * value once we have one, otherwise the caller's assumed default.
   */
  getPointsPerRecord(fallback: number): number {
    return this.observedPointsPerRecord ?? fallback;
  }

  /**
   * Whether an empirical points-per-record estimate exists yet. Before the
   * first same-window reading pair, any capacity/window the server reports
   * could belong to a bucket with completely different per-request cost
   * semantics than the caller's assumed default — proactively pacing against
   * it is as likely to be needlessly conservative as it is accurate. Callers
   * should skip proactive delay until this is true and rely on the reactive
   * 429 path (`handleRateLimitHit` + `waitForPermit`) in the meantime, which
   * is safe regardless of which bucket is actually being reported.
   */
  hasObservedPointsPerRecord(): boolean {
    return this.observedPointsPerRecord !== null;
  }

  getActualRemaining(): number {
    if (!this.state) return 0;
    if (Math.floor(Date.now() / 1000) >= this.state.resetAt) return this.state.limit;
    return this.state.remaining;
  }

  getServerCapacity(): { limit: number; windowSeconds: number } | null {
    if (!this.state || this.state.limit === 0) return null;
    return { limit: this.state.limit, windowSeconds: this.state.windowSeconds };
  }

  hasServerInfo(): boolean {
    return this.state !== null && this.state.limit > 0;
  }

  /**
   * Called when the server returns a 429. Zeroes remaining so the next
   * `waitForPermit` actually blocks until the window resets.
   *
   * If the 429 carried no usable reset time, the stored `resetAt` can already
   * be in the past. `waitForPermit` treats a past `resetAt` as a fresh window
   * and returns immediately, which turns the retry into a tight 429 loop, so
   * push `resetAt` forward to guarantee a real wait.
   */
  handleRateLimitHit(errHeaders?: Record<string, string>): void {
    if (errHeaders && Object.keys(errHeaders).length > 0) {
      this.updateFromHeaders(errHeaders);
      // A 429's Retry-After (delta seconds) is the server's own statement of
      // when to come back; honour it even when ratelimit-reset looks shorter.
      const h = normalizeHeaders(errHeaders);
      const retryAfter = parseInt(h['retry-after'] ?? '', 10);
      if (!isNaN(retryAfter) && this.state) {
        const nowSec = Math.floor(Date.now() / 1000);
        const retryAt = nowSec + retryAfter;
        if (retryAt > this.state.resetAt) this.state.resetAt = retryAt;
      }
    }
    const now = Math.floor(Date.now() / 1000);
    if (this.state) {
      this.state.remaining = 0;
      if (this.state.resetAt <= now) {
        this.state.resetAt = now + RATE_LIMIT_FALLBACK_WAIT_SECONDS;
      }
    } else {
      // A first request can be refused with Retry-After and no ratelimit
      // headers, so there is no state for the code above to have extended.
      const retryAfter = parseInt(normalizeHeaders(errHeaders ?? {})['retry-after'] ?? '', 10);
      const waitSeconds = retryAfter > 0 ? retryAfter : 3600;
      this.state = { limit: 5000, remaining: 0, resetAt: now + waitSeconds, windowSeconds: 3600 };
    }
    // The server itself confirmed the exhaustion, so `waitForPermit` should
    // honour the full advertised reset rather than capping the wait.
    this.exhaustedBy429 = true;
  }

  /**
   * Wait until there is sufficient quota to send `pointsNeeded` points.
   * Polls `isCancelled` every 50 ms so callers can abort mid-wait.
   *
   * When a wait is needed, `onWait` reports the reason and the chosen duration
   * immediately, then re-reports remaining time as a heartbeat every
   * `WAIT_HEARTBEAT_SECONDS` so no wait is ever silent.
   *
   * Waits fall into two classes. A *server-confirmed* wait (this call follows
   * `handleRateLimitHit`) sleeps out the full advertised reset — the server
   * itself demands it. A *ledger-only* wait (headers minus headroom say the
   * batch won't fit, but no 429 backs that up) is capped at
   * `maxLedgerWaitSeconds`: the tightest reported bucket may not even be the
   * write-points bucket, so instead of sleeping out a full window on possibly
   * phantom quota, the permit is granted and the next request's headers
   * re-learn the real remaining. A genuine limit re-establishes itself the
   * reactive way, via a 429.
   */
  async waitForPermit(
    pointsNeeded: number,
    isCancelled?: () => boolean,
    onWait?: (info: PermitWaitInfo) => void,
  ): Promise<void> {
    if (!this.state) return; // no info yet — let first request probe

    const now = Math.floor(Date.now() / 1000);
    if (now >= this.state.resetAt) {
      this.state.remaining = this.state.limit;
      this.state.resetAt = now + this.state.windowSeconds;
      this.exhaustedBy429 = false;
    }

    const headroomPts = Math.floor(this.state.limit * this.headroom);
    const effective = this.state.remaining - headroomPts;

    if (effective >= pointsNeeded) {
      this.state.remaining = Math.max(0, this.state.remaining - pointsNeeded);
      return;
    }

    const reason = this.exhaustedBy429
      ? `Server-confirmed rate limit exhausted (${this.state.remaining}/${this.state.limit} pts remaining)`
      : `Local quota ledger below headroom (${this.state.remaining}/${this.state.limit} pts, ${headroomPts} reserved) — no recent 429, re-probing server`;

    const resetWaitSeconds = Math.max(0, this.state.resetAt - Math.floor(Date.now() / 1000)) + 1;
    const waitSeconds = this.exhaustedBy429
      ? resetWaitSeconds
      : Math.min(resetWaitSeconds, this.maxLedgerWaitSeconds);

    onWait?.({ reason, totalWaitSeconds: waitSeconds, remainingSeconds: waitSeconds });

    const end = Date.now() + waitSeconds * 1000;
    await new Promise<void>((resolve) => {
      let lastBeatAt = Date.now();
      const tick = () => {
        if (isCancelled?.() || Date.now() >= end) { resolve(); return; }
        if (onWait && Date.now() - lastBeatAt >= WAIT_HEARTBEAT_SECONDS * 1000) {
          lastBeatAt = Date.now();
          onWait({
            reason,
            totalWaitSeconds: waitSeconds,
            remainingSeconds: Math.max(1, Math.ceil((end - Date.now()) / 1000)),
          });
        }
        setTimeout(tick, Math.min(50, end - Date.now()));
      };
      tick();
    });

    if (this.state && !isCancelled?.()) {
      const nowAfter = Math.floor(Date.now() / 1000);
      if (nowAfter >= this.state.resetAt) {
        // A genuine window reset restores the ledger. A capped probe does not
        // — the next response headers re-learn real quota either way.
        this.state.remaining = this.state.limit;
        this.state.resetAt = nowAfter + this.state.windowSeconds;
        this.exhaustedBy429 = false;
      }
      this.state.remaining = Math.max(0, this.state.remaining - pointsNeeded);
    }
  }

  /**
   * Returns a reservation made by `waitForPermit` that was never actually
   * spent — e.g. the request it was reserved for failed for a reason
   * unrelated to rate limiting (validation error, network failure) rather
   * than being sent and accepted or rejected by the server. Without this,
   * failed batches permanently drain the local quota ledger even though the
   * server's real quota was untouched, eventually causing `waitForPermit` to
   * block on phantom rate limiting.
   */
  refund(points: number): void {
    if (!this.state) return;
    this.state.remaining = Math.min(this.state.limit, this.state.remaining + points);
  }
}
