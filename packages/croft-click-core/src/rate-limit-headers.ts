/**
 * Rate-limit header parsing — environment-agnostic.
 * No logger dependency; callers surface messages as they see fit.
 */

export interface RateLimitHeaders {
  limit?: number;
  remaining?: number;
  reset?: number;
  windowSeconds?: number;
}

/** A fetch `Headers` instance (what XRPC responses and errors carry) or a plain record. */
export type HeadersInput = Headers | Record<string, string>;

export function normalizeHeaders(headers: HeadersInput | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  // `Object.entries()` on a `Headers` instance yields nothing, which silently
  // turns every response into a headerless one.
  if (typeof (headers as Headers).forEach === 'function') {
    (headers as Headers).forEach((v, k) => { out[k.toLowerCase()] = v; });
  } else {
    for (const [k, v] of Object.entries(headers)) out[k.toLowerCase()] = v;
  }
  return out;
}

/** Response headers carried by a failed XRPC call, as a lowercase record. */
export function errorHeaders(err: unknown): Record<string, string> {
  const e = err as any;
  return normalizeHeaders(e?.headers ?? e?.response?.headers);
}

export function parseRateLimitHeaders(headers: HeadersInput): RateLimitHeaders {
  const h = normalizeHeaders(headers);
  const get = (k: string) => h[k] ?? h[`x-${k}`] ?? '';

  const limit = parseInt(get('ratelimit-limit'), 10);
  const remaining = parseInt(get('ratelimit-remaining'), 10);
  const reset = parseInt(get('ratelimit-reset'), 10);
  const policy = get('ratelimit-policy');

  let windowSeconds: number | undefined;
  const m = /;w=(\d+)/.exec(policy);
  if (m) windowSeconds = parseInt(m[1], 10);
  else if (!isNaN(reset)) {
    // ratelimit-reset is a delta in seconds per the IETF draft; a value past
    // ~2001 in epoch seconds is an absolute timestamp instead.
    windowSeconds =
      reset >= 1_000_000_000
        ? Math.max(0, reset - Math.floor(Date.now() / 1000))
        : Math.max(0, reset);
  }

  return {
    limit: isNaN(limit) ? undefined : limit,
    remaining: isNaN(remaining) ? undefined : remaining,
    reset: isNaN(reset) ? undefined : reset,
    windowSeconds,
  };
}

export function isRateLimitError(err: unknown): boolean {
  const e = err as any;
  if (e?.status === 429) return true;
  const msg = (e?.message ?? '').toLowerCase();
  return msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('ratelimit');
}
