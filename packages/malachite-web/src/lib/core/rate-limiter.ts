// Re-export from the CLI package's core subpath
export { RateLimiter } from '@ewanc26/malachite/core';
// Backwards-compatible alias for any code that referenced BrowserRateLimiter
export { RateLimiter as BrowserRateLimiter } from '@ewanc26/malachite/core';
