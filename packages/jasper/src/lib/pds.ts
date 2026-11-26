/**
 * PDS access shared by the Node and browser importers: authenticated blob
 * uploads, and waiting out rate limits instead of failing the item.
 */
import type { Client } from '@atproto/lex';
import {
  RateLimiter,
  errorHeaders,
  isRateLimitError,
  normalizeHeaders,
  type PermitWaitInfo,
} from '@ewanc26/croft-click-core';

export interface RateLimitHooks {
  /** Called when a wait starts, then periodically until it ends. */
  onWait?: (info: PermitWaitInfo) => void;
  /** Polled during a wait; return true once to end it and retry. */
  retryNow?: () => boolean;
  /** Called once a wait is over and requests are flowing again. */
  onResume?: () => void;
  isCancelled?: () => boolean;
}

/** Upload a blob through the client's own session, so it is authenticated. */
export async function uploadBlob(
  client: Client,
  data: Uint8Array,
  mimeType: string,
): Promise<{ cid: string; mimeType: string; size: number }> {
  const response = await client.uploadBlob(data as any, { encoding: mimeType as `${string}/${string}` });
  const { blob } = response.body as any;
  return { cid: blob.ref.toString(), mimeType: blob.mimeType, size: blob.size };
}

/**
 * A view of `client` whose requests sit out a 429 and are then sent again.
 * A refused request was not applied, so resending it is safe.
 */
export function withRateLimitRetry(
  client: Client,
  limiter: RateLimiter,
  hooks: RateLimitHooks = {},
): Client {
  const xrpc = async (...args: any[]): Promise<unknown> => {
    // Reads report a different quota from writes; only writes teach the limiter.
    const isWrite = (args[0]?.main ?? args[0])?.type === 'procedure';
    while (true) {
      const waited = limiter.isBlocked();
      await limiter.waitOutBlock(hooks.isCancelled, hooks.onWait, hooks.retryNow);
      if (hooks.isCancelled?.()) throw new Error('Import cancelled');
      if (waited) hooks.onResume?.();
      try {
        const response: any = await (client as any).xrpc(...args);
        if (isWrite) {
          limiter.noteSuccess();
          limiter.updateFromHeaders(normalizeHeaders(response.headers));
        }
        return response;
      } catch (error) {
        if (!isRateLimitError(error)) throw error;
        limiter.handleRateLimitHit(errorHeaders(error));
      }
    }
  };

  // `call`, `uploadBlob` and friends all go through `this.xrpc`.
  return new Proxy(client, {
    get(target, prop, receiver) {
      return prop === 'xrpc' ? xrpc : Reflect.get(target, prop, receiver);
    },
  });
}
