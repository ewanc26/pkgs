import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '@atproto/lex';
import { RateLimiter, rateLimitBackoffSeconds } from '../rate-limiter.js';
import { errorHeaders, normalizeHeaders } from '../rate-limit-headers.js';
import { applyWritesWithHeaders } from '../apply-writes.js';
import { ProactiveRatePacer } from '../proactive-rate-pacer.js';
import { estimateImportDuration } from '../import-estimate.js';
import { publishRecords, type PublishProgress } from '../publisher.js';
import type { PlayRecord } from '../types.js';

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** The wait a limiter has chosen, read without sitting it out. */
async function plannedWait(rl: RateLimiter): Promise<number> {
  let waited = 0;
  await rl.waitOutBlock(() => true, (info) => { waited = info.totalWaitSeconds; });
  return waited;
}

describe('headers as the XRPC client delivers them', () => {
  it('reads a fetch Headers instance', () => {
    assert.deepEqual(normalizeHeaders(new Headers({ 'Retry-After': '30' })), { 'retry-after': '30' });
  });

  it('reads them off an XRPC error, wherever it keeps them', () => {
    const headers = new Headers({ 'ratelimit-reset': '5' });
    assert.equal(errorHeaders({ headers })['ratelimit-reset'], '5');
    assert.equal(errorHeaders({ response: { headers } })['ratelimit-reset'], '5');
    assert.deepEqual(errorHeaders(new Error('no headers')), {});
  });

  it('honours Retry-After delivered as Headers', async () => {
    const rl = new RateLimiter();
    rl.handleRateLimitHit(new Headers({ 'retry-after': '30' }));
    const waited = await plannedWait(rl);
    assert.ok(waited >= 30 && waited <= 32, `got ${waited}s`);
  });

  it('keeps the response headers of applyWrites', async () => {
    const client = {
      xrpc: async () => ({ headers: new Headers({ 'RateLimit-Remaining': '42' }), body: { results: [{}] } }),
      call: async () => assert.fail('call() drops the headers'),
    } as unknown as Client;
    const res = await applyWritesWithHeaders(client, { repo: 'did:plc:test', writes: [] });
    assert.equal(res.headers['ratelimit-remaining'], '42');
    assert.equal(res.results?.length, 1);
  });
});

describe('429 recovery', () => {
  it('doubles the backoff while refusals continue, up to fifteen minutes', async () => {
    assert.deepEqual([0, 1, 2, 3, 4, 20].map(rateLimitBackoffSeconds), [60, 120, 240, 480, 900, 900]);
    const rl = new RateLimiter();
    rl.handleRateLimitHit();
    rl.handleRateLimitHit();
    const waited = await plannedWait(rl);
    assert.ok(waited >= 120 && waited <= 122, `got ${waited}s`);
  });

  it('starts the backoff over after a success', async () => {
    const rl = new RateLimiter();
    rl.handleRateLimitHit();
    rl.handleRateLimitHit();
    rl.noteSuccess();
    rl.handleRateLimitHit();
    const waited = await plannedWait(rl);
    assert.ok(waited >= 60 && waited <= 62, `got ${waited}s`);
  });

  it('does not invent a server capacity from a bare 429', () => {
    const rl = new RateLimiter();
    rl.handleRateLimitHit();
    assert.equal(rl.getServerCapacity(), null);
    assert.equal(rl.isBlocked(), true);
  });

  it('lets the user end a wait early', async () => {
    const rl = new RateLimiter();
    rl.handleRateLimitHit(new Headers({ 'retry-after': '3600' }));
    let resumeAt = 0;
    const start = Date.now();
    await rl.waitOutBlock(undefined, (info) => { resumeAt = info.resumeAt; }, () => true);
    assert.ok(Date.now() - start < 1000);
    assert.ok(resumeAt > start + 3_500_000);
    assert.equal(rl.isBlocked(), false);
  });
});

describe('pacing only what needs it', () => {
  const pacer = new ProactiveRatePacer();

  it('sends an import that fits the available quota at full speed', () => {
    assert.equal(pacer.calculateOptimalBatchSize(5000, 3600, 5000, 200, 3, 1000), 200);
    assert.equal(pacer.calculateDelay(200, 5000, 3600, 5000, 3, 1000).delayMs, 500);
  });

  it('ignores the daily window for an import that fits inside it', () => {
    const pacing = pacer.calculateDelay(50, 5000, 3600, 5000, 3, 5000);
    assert.doesNotMatch(pacing.reason, /write policy/);
  });

  it('still paces against the daily window for an import that exceeds it', () => {
    const pacing = pacer.calculateDelay(4, 5000, 3600, 5000, 3, 50_000);
    assert.match(pacing.reason, /35,000 pts\/86400s write policy/);
  });

  it('keeps the reserve: a spent window is not a burst', () => {
    assert.ok(pacer.calculateDelay(10, 5000, 3600, 700, 3, 100).delayMs > 500);
  });

  it('estimates seconds, not hours, for an import that fits now', () => {
    const estimate = estimateImportDuration(1000, 5000, 3600, 3, 5000);
    assert.ok(estimate.worstCaseSeconds <= 10);
  });
});

describe('publishRecords through a 429', () => {
  const plays: PlayRecord[] = Array.from({ length: 3 }, (_, n) => ({
    $type: 'fm.teal.feed.play',
    trackName: `Track ${n}`,
    artists: [{ artistName: 'Artist' }],
    playedTime: new Date(Date.UTC(2025, 0, 1, 0, n)).toISOString(),
    submissionClientAgent: 'test',
    musicServiceUri: 'https://example.com',
  }));

  it('waits, resends the same records and loses none', async () => {
    const sent: number[] = [];
    const client = {
      assertDid: 'did:plc:test',
      xrpc: async (_m: unknown, { body }: { body: { writes: unknown[] } }) => {
        sent.push(body.writes.length);
        if (sent.length === 1) {
          throw Object.assign(new Error('Rate Limit Exceeded'), {
            status: 429,
            headers: new Headers({ 'retry-after': '3600' }),
          });
        }
        return { headers: new Headers(), body: { results: body.writes.map(() => ({})) } };
      },
    } as unknown as Client;
    const waits: PublishProgress[] = [];

    const result = await publishRecords(client, plays, false, {
      onProgress: (p) => { if (p.waiting) waits.push(p); },
      onLog: () => {},
      isCancelled: () => false,
      retryNow: () => true,
    });

    assert.deepEqual(result, { successCount: 3, errorCount: 0, cancelled: false });
    assert.deepEqual(sent, [3, 3]);
    assert.equal(waits[0]?.waiting?.serverConfirmed, true);
    assert.ok(waits[0]!.waiting!.resumeAt > (nowSeconds() + 3000) * 1000);
  });
});
