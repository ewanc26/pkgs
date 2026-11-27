/** Sit out a PDS rate limit and send the refused request again. */
import {
  RateLimiter,
  errorHeaders,
  isRateLimitError,
  type PermitWaitInfo,
} from '@ewanc26/croft-click-core'

export interface WaitHooks {
  /** Called when a wait starts, then periodically until it ends. */
  onWait?: (info: PermitWaitInfo) => void
  /** Polled during a wait; return true once to end it and retry. */
  retryNow?: () => boolean
  isCancelled?: () => boolean
}

export function rateLimitRetry(hooks: WaitHooks = {}) {
  const limiter = new RateLimiter()
  return async function send<T>(request: () => Promise<T>): Promise<T> {
    while (true) {
      await limiter.waitOutBlock(hooks.isCancelled, hooks.onWait, hooks.retryNow)
      // A stop only abandons requests the server is refusing.
      if (hooks.isCancelled?.() && limiter.isBlocked()) throw new Error('Import cancelled')
      try {
        const result = await request()
        limiter.noteSuccess()
        return result
      } catch (error) {
        if (!isRateLimitError(error)) throw error
        // A refused request was not applied, so sending it again is safe.
        limiter.handleRateLimitHit(errorHeaders(error))
      }
    }
  }
}
