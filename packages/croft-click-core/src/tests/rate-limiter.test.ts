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


  it('treats a small ratelimit-reset as delta seconds, not an epoch', () => {
    const rl = new RateLimiter();
    // IETF draft: reset is a delta. 300 means "resets in 300s", not 1970.
    rl.updateFromHeaders({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4000',
      'ratelimit-reset': '300',
      'ratelimit-policy': '5000;w=3600',
    });
    assert.equal(rl.getActualRemaining(), 4000, 'window still open, remaining readable');
    // A 429 carrying only a Retry-After delta must push the wait out by that delta.
    rl.handleRateLimitHit({ 'retry-after': '37531' });
    assert.equal(rl.getActualRemaining(), 0);
    const cap = rl.getServerCapacity();
    assert.ok(cap);
  });

  it('still accepts an epoch ratelimit-reset', () => {
    const rl = new RateLimiter();
    rl.updateFromHeaders({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4000',
      'ratelimit-reset': String(nowSeconds() + 600),
      'ratelimit-policy': '5000;w=3600',
    });
    assert.equal(rl.getActualRemaining(), 4000);
  });

  it('waitForPermit blocks until a delta reset has passed', async () => {
    const rl = new RateLimiter();
    rl.updateFromHeaders({
      'ratelimit-limit': '100',
      'ratelimit-remaining': '0',
      'ratelimit-reset': '2', // two seconds from now (delta)
      'ratelimit-policy': '100;w=3600',
    });
    const start = Date.now();
    await rl.waitForPermit(10);
    assert.ok(Date.now() - start >= 1500, 'waited out the delta window');
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

describe('RateLimiter reset parsing (issue #90)', () => {
  it('treats an epoch-millisecond ratelimit-reset as ms, not far-future epoch seconds', () => {
    const rl = new RateLimiter();
    const resetEpochMs = (nowSeconds() + 600) * 1000; // 13 digits
    rl.updateFromHeaders({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4000',
      'ratelimit-reset': String(resetEpochMs),
      'ratelimit-policy': '5000;w=3600',
    });
    // Before the fix this landed ~55,000 years in the future; the window must
    // read as open (~600s out) with remaining reachable.
    assert.equal(rl.getActualRemaining(), 4000, 'epoch-ms reset parsed as an open window');
  });

  it('clamps an implausible far-future epoch reset to one window', async () => {
    const rl = new RateLimiter();
    // Epoch seconds ~30 years out, against a 10s learned window: implausible.
    rl.updateFromHeaders({
      'ratelimit-limit': '100',
      'ratelimit-remaining': '80',
      'ratelimit-reset': String(nowSeconds() + 30),
      'ratelimit-policy': '100;w=10',
    });
    rl.handleRateLimitHit({}); // server-confirmed: zeroes remaining, keeps reset
    let info: any = null;
    let cancel = false;
    // Cancel as soon as the limiter reports its wait, then inspect the plan.
    await rl.waitForPermit(30, () => cancel, (x) => { info = x; cancel = true; });
    assert.ok(info, 'wait reported via onWait');
    assert.ok(
      info.totalWaitSeconds <= 11,
      `far-future reset clamped to one 10s window (reported ${info.totalWaitSeconds}s)`,
    );
  });
});

describe('RateLimiter waitForPermit feedback and phantom-ledger cap (issue #90)', () => {
  it('caps a ledger-only block and reports the wait instead of sleeping a full window', async () => {
    const rl = new RateLimiter({ maxLedgerWaitSeconds: 1 });
    rl.updateFromHeaders({
      'ratelimit-limit': '100',
      'ratelimit-remaining': '0',
      'ratelimit-reset': '3600', // delta: full window away
      'ratelimit-policy': '100;w=3600',
    });
    const events: any[] = [];
    const start = Date.now();
    await rl.waitForPermit(10, undefined, (x) => events.push(x));
    const elapsed = Date.now() - start;
    assert.ok(events.length >= 1, 'onWait reported');
    assert.equal(events[0].totalWaitSeconds, 1, 'ledger-only wait capped, not a full window');
    assert.ok(/ledger|headroom/i.test(events[0].reason), `reason mentions the ledger: "${events[0].reason}"`);
    assert.ok(elapsed >= 900 && elapsed < 5000, `waited ~${elapsed}ms, not a full window`);
  });

  it('does not cap or mislabel a 429-confirmed wait', async () => {
    const rl = new RateLimiter({ maxLedgerWaitSeconds: 1 });
    rl.updateFromHeaders({
      'ratelimit-limit': '100',
      'ratelimit-remaining': '80',
      'ratelimit-reset': '60', // delta seconds
      'ratelimit-policy': '100;w=3600',
    });
    rl.handleRateLimitHit(); // server-confirmed: remaining 0, reset stays ~60s out
    let info: any = null;
    let cancel = false;
    await rl.waitForPermit(10, () => cancel, (x) => { info = x; cancel = true; });
    assert.ok(info, 'wait reported via onWait');
    assert.ok(
      info.totalWaitSeconds > 50,
      `server-confirmed wait honours the advertised reset, not the ledger cap (reported ${info.totalWaitSeconds}s)`,
    );
    assert.ok(/server/i.test(info.reason), `reason says server-confirmed: "${info.reason}"`);
  });
});

describe('RateLimiter observed points-per-record gating (issue #90)', () => {
  it('uses the learned points-per-record rather than the assumed constant', () => {
    const rl = new RateLimiter();
    const now = nowSeconds();
    // First response: 5000/4900 with the same window and reset.
    rl.updateFromHeaders({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4900',
      'ratelimit-reset': String(now + 600),
      'ratelimit-policy': '5000;w=3600',
    }, 100);
    // Second response, same window: 100 records consumed only 100 points —
    // a request-counted bucket, not the assumed 3-points-per-write one.
    rl.updateFromHeaders({
      'ratelimit-limit': '5000',
      'ratelimit-remaining': '4800',
      'ratelimit-reset': String(now + 600),
      'ratelimit-policy': '5000;w=3600',
    }, 100);
    assert.ok(rl.hasObservedPointsPerRecord(), 'observed points-per-record learned from consecutive readings');
    // Observed cost is between the first sample (1.0) and the EMA; either way
    // it must be far from the assumed fallback of 3.
    const learned = rl.getPointsPerRecord(3);
    assert.ok(
      learned > 0 && learned < 1.5 && learned !== 3,
      `learned points-per-record used for gating (got ${learned})`,
    );
  });
});

describe('RateLimiter 429 with no prior state', () => {
  const blockedFor = async (headers?: Record<string, string>) => {
    const rl = new RateLimiter();
    rl.handleRateLimitHit(headers);
    let waited = 0;
    // Cancelled at once: only the chosen wait is of interest.
    await rl.waitForPermit(1, () => true, (info) => { waited = info.totalWaitSeconds; });
    return waited;
  };

  it('honours a Retry-After that arrives without ratelimit headers', async () => {
    const waited = await blockedFor({ 'Retry-After': '30' });
    assert.ok(waited >= 30 && waited <= 32, `waits about 30s (got ${waited}s)`);
  });

  it('backs off for a minute, not an hour, when the 429 says nothing usable', async () => {
    const useless: (Record<string, string> | undefined)[] = [
      undefined,
      {},
      { 'retry-after': '0' },
      { 'retry-after': 'soon' },
    ];
    for (const headers of useless) {
      const waited = await blockedFor(headers);
      assert.ok(waited >= 60 && waited <= 62, `waits about a minute (got ${waited}s)`);
    }
  });
});
