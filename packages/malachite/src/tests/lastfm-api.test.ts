/**
 * Tests for the live Last.fm API fetcher (fetchLastFmScrobbles).
 *
 * Mocks globalThis.fetch with Last.fm-shaped responses rather than hitting
 * the real API, following the same pattern as car-fetch.test.ts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fetchLastFmScrobbles } from '@ewanc26/croft-click-core';

function withMockFetch<T>(handler: (url: URL) => Response, run: () => Promise<T>): Promise<T> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    return handler(url);
  }) as typeof fetch;
  return run().finally(() => {
    globalThis.fetch = realFetch;
  });
}

function page(tracks: unknown[], pageNum: number, totalPages: number, total: number) {
  return {
    recenttracks: {
      track: tracks,
      '@attr': { page: String(pageNum), totalPages: String(totalPages), total: String(total) },
    },
  };
}

function track(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Track',
    artist: { '#text': 'Artist' },
    album: { '#text': 'Album', mbid: '' },
    date: { uts: '1623801600' },
    ...overrides,
  };
}

describe('fetchLastFmScrobbles', () => {
  it('rejects a blank username or API key without making a request', async () => {
    await assert.rejects(() => fetchLastFmScrobbles('', 'key'), /username/i);
    await assert.rejects(() => fetchLastFmScrobbles('user', ''), /API key/i);
  });

  it('paginates through every page and converts tracks to LastFmCsvRecord', async () => {
    const seenPages: number[] = [];
    const records = await withMockFetch(
      (url) => {
        const p = Number(url.searchParams.get('page'));
        seenPages.push(p);
        const body = p === 1
          ? page([track({ name: 'A' })], 1, 2, 2)
          : page([track({ name: 'B' })], 2, 2, 2);
        return new Response(JSON.stringify(body), { status: 200 });
      },
      () => fetchLastFmScrobbles('alice', 'testkey'),
    );

    assert.deepStrictEqual(seenPages, [1, 2]);
    assert.strictEqual(records.length, 2);
    assert.strictEqual(records[0].track, 'A');
    assert.strictEqual(records[1].track, 'B');
    assert.strictEqual(records[0].uts, '1623801600');
  });

  it('skips the in-progress "now playing" track', async () => {
    const records = await withMockFetch(
      () => new Response(JSON.stringify(page([
        track({ name: 'Playing now', date: undefined, '@attr': { nowplaying: 'true' } }),
        track({ name: 'Finished' }),
      ], 1, 1, 2)), { status: 200 }),
      () => fetchLastFmScrobbles('alice', 'testkey'),
    );

    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].track, 'Finished');
  });

  it('throws a descriptive error for an unknown Last.fm user', async () => {
    await assert.rejects(
      withMockFetch(
        () => new Response(JSON.stringify({ error: 6, message: 'User not found' }), { status: 404 }),
        () => fetchLastFmScrobbles('nobody', 'testkey'),
      ),
      /not found/i,
    );
  });

  it('throws a descriptive error for an invalid API key', async () => {
    await assert.rejects(
      withMockFetch(
        () => new Response(JSON.stringify({ error: 10, message: 'Invalid API key' }), { status: 403 }),
        () => fetchLastFmScrobbles('alice', 'badkey'),
      ),
      /invalid.*api key/i,
    );
  });
});
