import type { Client } from '@atproto/lex';
import { com } from '@bsky/sdk/lexicons';
import { normalizeHeaders } from './rate-limit-headers.js';

export interface ApplyWritesResponse {
  results: any[] | undefined;
  /** Lowercase response headers, including the PDS's `ratelimit-*` quota. */
  headers: Record<string, string>;
}

/**
 * `com.atproto.repo.applyWrites`, keeping the response headers.
 *
 * `client.call()` resolves to the response body alone, so a publisher using it
 * never learns its quota. This goes through `client.xrpc()` instead.
 */
export async function applyWritesWithHeaders(
  client: Client,
  input: { repo: string; writes: unknown[] },
  options: { signal?: AbortSignal } = {},
): Promise<ApplyWritesResponse> {
  const response: any = await (client as any).xrpc(com.atproto.repo.applyWrites.main, {
    ...options,
    body: input,
  });
  return { results: response.body?.results, headers: normalizeHeaders(response.headers) };
}
