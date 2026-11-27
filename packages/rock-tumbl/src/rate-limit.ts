/** Sit out a PDS rate limit and send the refused request again. */
import type { PermitWaitInfo, RateLimiter } from '@ewanc26/croft-click-core'

export interface WaitHooks {
  /** Called when a wait starts, then periodically until it ends. */
  onWait?: (info: PermitWaitInfo) => void
  /** Polled during a wait; return true once to end it and retry. */
  retryNow?: () => boolean
  isCancelled?: () => boolean
}

export function rateLimitRetry(hooks: WaitHooks = {}) {
  let limiter: RateLimiter | undefined
  return async function send<T>(request: () => Promise<T>): Promise<T> {
    // Loaded on first use: the shared core is ESM only, and a static import
    // would stop this package's CommonJS build from loading at all.
    const core = await import('@ewanc26/croft-click-core')
    limiter ??= new core.RateLimiter()
    while (true) {
      await limiter.waitOutBlock(hooks.isCancelled, hooks.onWait, hooks.retryNow)
      // A stop only abandons requests the server is refusing.
      if (hooks.isCancelled?.() && limiter.isBlocked()) throw new Error('Import cancelled')
      try {
        const result = await request()
        limiter.noteSuccess()
        return result
      } catch (error) {
        if (!core.isRateLimitError(error)) throw error
        // A refused request was not applied, so sending it again is safe.
        limiter.handleRateLimitHit(core.errorHeaders(error))
      }
    }
  }
}
