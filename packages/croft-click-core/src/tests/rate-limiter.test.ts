import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../rate-limiter.js';

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('RateLimiter 429 handling', () => {
  it('does not treat a stale reset as an open window after a 429', () => {
    const rl = new RateLimiter();
    // Learn a window whose reset time has already passed.
    rl.updateFromHeaders({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4000',
      'ratelimit-reset': String(nowSeconds() - 10),
      'ratelimit-policy': '5000;w=3600',
    });
    assert.equal(rl.getActualRemaining(), 5000, 'stale window reads as reset before the 429');

    // A 429 with no usable reset headers must block, not reopen the window.
    rl.handleRateLimitHit();
    assert.equal(rl.getActualRemaining(), 0);
  });

  it('keeps a future reset from the 429 headers', () => {
    const rl = new RateLimiter();
    rl.updateFromHeaders({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4000',
      'ratelimit-reset': String(nowSeconds() + 600),
      'ratelimit-policy': '5000;w=3600',
    });
    rl.handleRateLimitHit({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '0',
      'ratelimit-reset': String(nowSeconds() + 300),
      'ratelimit-policy': '5000;w=3600',
    });
    assert.equal(rl.getActualRemaining(), 0);
  });
});
