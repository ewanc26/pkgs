import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RateLimiter } from '../utils/rate-limiter.js';
import { getMalachiteStateDir } from '../utils/platform.js';

// The limiter persists to the home directory: never touch the real one.
process.env.HOME = process.env.USERPROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'malachite-home-'));

const blockPath = () => path.join(getMalachiteStateDir(), 'state', 'rate-limit-block.json');

describe('RateLimiter', () => {
  it('persists state after updateFromHeaders with headroom threshold', () => {
    // 50% headroom means we preserve 50% of the limit
    const rl = new RateLimiter({ headroom: 0.5 });
    const now = Math.floor(Date.now() / 1000);
    const headers = {
      'ratelimit-limit': '100',
      'ratelimit-remaining': '80',
      'ratelimit-reset': String(now + 3600),
      'ratelimit-policy': '100;w=3600',
    };
    rl.updateFromHeaders(headers);
    const statePath = path.join(getMalachiteStateDir(), 'state', 'rate-limit.json');
    assert.ok(fs.existsSync(statePath), 'Persisted state file should exist');
    const raw = fs.readFileSync(statePath, 'utf8');
    const o = JSON.parse(raw);
    
    // New behavior: stores actual remaining (80), not modified by headroom
    // Headroom is applied when checking/reserving quota, not when storing
    assert.strictEqual(o.remaining, 80);
    assert.strictEqual(o.limit, 100);
    assert.strictEqual(o.windowSeconds, 3600);
    assert.strictEqual(o.headroomThreshold, 0.5);
  });

  it('treats a small ratelimit-reset as delta seconds, and honours Retry-After on 429', () => {
    const rl = new RateLimiter({ headroom: 0.15 });
    // IETF draft: reset is a delta. 300 means "resets in 300s", not 1970.
    rl.updateFromHeaders({
      'ratelimit-limit': '100',
      'ratelimit-remaining': '80',
      'ratelimit-reset': '300',
      'ratelimit-policy': '100;w=3600',
    });
    const statePath = path.join(getMalachiteStateDir(), 'state', 'rate-limit.json');
    const o = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    assert.ok(o.resetAt >= now + 290 && o.resetAt <= now + 310,
      `delta reset lands ~300s out (got ${o.resetAt}, now ${now})`);

    // A 429 carrying Retry-After must push the wait out by that delta.
    rl.handleRateLimitHit(new Headers({ 'retry-after': '37531' }));
    const o2 = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.strictEqual(o2.remaining, 0);
    const block = JSON.parse(fs.readFileSync(blockPath(), 'utf8'));
    assert.ok(block.blockedUntil >= now + 37000, 'Retry-After delta honoured');
  });

  const blockAfter = (headers?: Headers) => {
    const now = Math.floor(Date.now() / 1000);
    new RateLimiter({ headroom: 0.15 }).handleRateLimitHit(headers);
    return JSON.parse(fs.readFileSync(blockPath(), 'utf8')).blockedUntil - now;
  };
  const forget = () => {
    fs.rmSync(path.join(getMalachiteStateDir(), 'state', 'rate-limit.json'), { force: true });
    fs.rmSync(blockPath(), { force: true });
  };

  it('honours Retry-After on a 429 that arrives before any rate-limit state', () => {
    forget();
    const asked = blockAfter(new Headers({ 'retry-after': '30' }));
    assert.ok(asked >= 30 && asked <= 32, `waits about 30s (got ${asked}s)`);
  });

  it('backs off for a minute, then two, and invents no capacity from a bare 429', () => {
    forget();
    const first = blockAfter();
    assert.ok(first >= 60 && first <= 62, `waits about a minute (got ${first}s)`);
    const second = blockAfter();
    assert.ok(second >= 120 && second <= 122, `then two (got ${second}s)`);
    assert.strictEqual(new RateLimiter().getServerCapacity(), null);
    forget();
  });

  it('waits only as long as the server asked, with nothing stacked on top', async () => {
    forget();
    const rl = new RateLimiter();
    rl.updateFromHeaders(new Headers({ 'ratelimit-limit': '5000', 'ratelimit-remaining': '4000', 'ratelimit-reset': '2' }));
    rl.handleRateLimitHit(new Headers({ 'retry-after': '2' }));
    const start = Date.now();
    assert.strictEqual(await rl.waitForPermit(3), true);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 1500 && elapsed < 5000, `waited ${elapsed}ms`);
    forget();
  });

  it('gives up waiting when the import is cancelled, keeping the block', async () => {
    forget();
    const rl = new RateLimiter({ isCancelled: () => true });
    rl.handleRateLimitHit(new Headers({ 'retry-after': '3600' }));
    assert.strictEqual(await rl.waitForPermit(3), false);
    assert.ok(JSON.parse(fs.readFileSync(blockPath(), 'utf8')).blockedUntil > 0);
    forget();
  });

  it('getSafeAvailablePoints respects headroom threshold', () => {
    const rl = new RateLimiter({ headroom: 0.15 }); // 15% headroom
    const now = Math.floor(Date.now() / 1000);
    const headers = {
      'ratelimit-limit': '1000',
      'ratelimit-remaining': '800',
      'ratelimit-reset': String(now + 3600),
      'ratelimit-policy': '1000;w=3600',
    };
    rl.updateFromHeaders(headers);
    
    // Safe points = remaining - (limit × headroom)
    // = 800 - (1000 × 0.15) = 800 - 150 = 650
    const safePoints = rl.getSafeAvailablePoints();
    assert.strictEqual(safePoints, 650);
  });

  it('waitForPermit reserves quota when available', async () => {
    const rl = new RateLimiter({ headroom: 0.0 }); // No headroom for simpler testing
    const now = Math.floor(Date.now() / 1000);
    const headers = {
      'ratelimit-limit': '100',
      'ratelimit-remaining': '50',
      'ratelimit-reset': String(now + 3600),
      'ratelimit-policy': '100;w=3600',
    };
    rl.updateFromHeaders(headers);
    
    const statePath = path.join(getMalachiteStateDir(), 'state', 'rate-limit.json');
    const before = JSON.parse(fs.readFileSync(statePath, 'utf8')).remaining;
    
    // Reserve 10 points
    await rl.waitForPermit(10);
    
    const after = JSON.parse(fs.readFileSync(statePath, 'utf8')).remaining;
    assert.strictEqual(after, before - 10);
  });

  it('returns 0 safe points when no state exists', () => {
    // Create a new rate limiter with a fresh state directory
    const rl = new RateLimiter({ headroom: 0.15 });
    
    // Clear any existing state
    const statePath = path.join(getMalachiteStateDir(), 'state', 'rate-limit.json');
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    
    // Should return 0 to force conservative start
    const safePoints = rl.getSafeAvailablePoints();
    assert.strictEqual(safePoints, 0);
  });

  it('hasServerInfo returns false initially', () => {
    const rl = new RateLimiter({ headroom: 0.15 });
    
    // Clear state
    const statePath = path.join(getMalachiteStateDir(), 'state', 'rate-limit.json');
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    
    assert.strictEqual(rl.hasServerInfo(), false);
  });

  it('hasServerInfo returns true after learning from headers', () => {
    const rl = new RateLimiter({ headroom: 0.15 });
    const now = Math.floor(Date.now() / 1000);
    const headers = {
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4970',
      'ratelimit-reset': String(now + 3600),
      'ratelimit-policy': '5000;w=3600',
    };
    
    rl.updateFromHeaders(headers);
    assert.strictEqual(rl.hasServerInfo(), true);
  });

  it('getServerCapacity returns server info after learning', () => {
    const rl = new RateLimiter({ headroom: 0.15 });
    const now = Math.floor(Date.now() / 1000);
    const headers = {
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4970',
      'ratelimit-reset': String(now + 3600),
      'ratelimit-policy': '5000;w=3600',
    };
    
    rl.updateFromHeaders(headers);
    const capacity = rl.getServerCapacity();
    
    assert.ok(capacity);
    assert.strictEqual(capacity.limit, 5000);
    assert.strictEqual(capacity.windowSeconds, 3600);
  });
  it('treats epoch-millisecond ratelimit-reset as ms, not far-future epoch seconds', () => {
    const rl = new RateLimiter({ headroom: 0.15 });
    const now = Math.floor(Date.now() / 1000);
    rl.updateFromHeaders({
      'ratelimit-limit': '100',
      'ratelimit-remaining': '80',
      'ratelimit-reset': String((now + 600) * 1000), // 13-digit epoch ms
      'ratelimit-policy': '100;w=3600',
    });
    const statePath = path.join(getMalachiteStateDir(), 'state', 'rate-limit.json');
    const o = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    // Before the fix this landed ~55,000 years in the future and wedged waitForReset forever.
    assert.ok(o.resetAt >= now + 590 && o.resetAt <= now + 610,
      `epoch-ms reset lands ~600s out (got ${o.resetAt}, now ${now})`);
    assert.strictEqual(rl.getActualRemaining(), 80, 'window still open, quota readable');
  });

  it('clamps an implausible far-future epoch reset to one window', () => {
    const rl = new RateLimiter({ headroom: 0.15 });
    const now = Math.floor(Date.now() / 1000);
    rl.updateFromHeaders({
      'ratelimit-limit': '100',
      'ratelimit-remaining': '80',
      'ratelimit-reset': String(now + 999_999_999), // epoch seconds, ~year 2058
      'ratelimit-policy': '100;w=3600',
    });
    const statePath = path.join(getMalachiteStateDir(), 'state', 'rate-limit.json');
    const o = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.ok(o.resetAt <= now + 3600,
      `reset clamped to one window (got ${o.resetAt}, now ${now})`);
  });

});
