/**
 * In-memory rate limiter ported from Malachite.
 * Tracks quota from response headers and gates requests to stay within limits.
 */

export interface RateLimitHeaders {
  limit?: number;
  remaining?: number;
  reset?: number;
  windowSeconds?: number;
}

export function normalizeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

export function parseRateLimitHeaders(headers: Headers): RateLimitHeaders {
  const h = normalizeHeaders(headers);
  const get = (k: string) => h[k] ?? h[`x-${k}`] ?? "";

  const limit = parseInt(get("ratelimit-limit"), 10);
  const remaining = parseInt(get("ratelimit-remaining"), 10);
  const reset = parseInt(get("ratelimit-reset"), 10);
  const policy = get("ratelimit-policy");

  let windowSeconds: number | undefined;
  const m = /;w=(\d+)/.exec(policy);
  if (m) windowSeconds = parseInt(m[1], 10);
  else if (!isNaN(reset)) {
    windowSeconds = Math.max(0, reset - Math.floor(Date.now() / 1000));
  }

  return {
    limit: isNaN(limit) ? undefined : limit,
    remaining: isNaN(remaining) ? undefined : remaining,
    reset: isNaN(reset) ? undefined : reset,
    windowSeconds,
  };
}

export function isRateLimitError(status: number, body?: string): boolean {
  if (status === 429) return true;
  const msg = (body ?? "").toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("ratelimit")
  );
}

interface State {
  limit: number;
  remaining: number;
  resetAt: number; // unix seconds
  windowSeconds: number;
}

export class RateLimiter {
  private state: State | null = null;
  private readonly headroom: number;

  constructor(opts?: { headroom?: number }) {
    this.headroom = opts?.headroom ?? 0.15;
  }

  updateFromHeaders(headers: Headers): void {
    const info = parseRateLimitHeaders(headers);

    if (info.limit === undefined || info.remaining === undefined) return;

    const now = Math.floor(Date.now() / 1000);
    this.state = {
      limit: info.limit,
      remaining: info.remaining,
      resetAt: info.reset ?? now + (info.windowSeconds ?? 3600),
      windowSeconds: info.windowSeconds ?? 3600,
    };
  }

  handleRateLimitHit(headers?: Headers): void {
    if (headers) {
      this.updateFromHeaders(headers);
    }
    const now = Math.floor(Date.now() / 1000);
    if (this.state) {
      this.state.remaining = 0;
    } else {
      // Fallback state if we hit a limit without headers
      this.state = {
        limit: 5000,
        remaining: 0,
        resetAt: now + 60,
        windowSeconds: 3600,
      };
    }
  }

  async waitForPermit(pointsNeeded = 1): Promise<void> {
    if (!this.state) return; // Probe first

    const now = Math.floor(Date.now() / 1000);
    if (now >= this.state.resetAt) {
      this.state.remaining = this.state.limit;
      this.state.resetAt = now + this.state.windowSeconds;
    }

    const headroomPts = Math.floor(this.state.limit * this.headroom);
    const effective = this.state.remaining - headroomPts;

    if (effective < pointsNeeded) {
      const waitSeconds = Math.max(1, this.state.resetAt - now);
      console.warn(`[rate-limit] hitting limit, waiting ${waitSeconds}s...`);
      await new Promise<void>((resolve) => setTimeout(resolve, waitSeconds * 1000));

      this.state.remaining = this.state.limit;
      this.state.resetAt =
        Math.floor(Date.now() / 1000) + this.state.windowSeconds;
    }

    this.state.remaining = Math.max(0, this.state.remaining - pointsNeeded);
  }
}

// Global instance for scrobble fetching
export const pdsRateLimiter = new RateLimiter({ headroom: 0.1 });
