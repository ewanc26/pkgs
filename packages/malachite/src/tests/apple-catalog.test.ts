import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AppleCatalogClient,
  convertAppleMusicToPlayRecord,
  enrichWithMusicBrainz,
  UnresolvedAppleArtistsError,
} from '@ewanc26/croft-click-core';
import type { AppleMusicRecord, PlayRecord } from '@ewanc26/croft-click-core';

const AGENT = 'malachite-test/0 ( https://example.invalid )';

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function appleFetch(results: unknown[]) {
  const calls: string[] = [];
  const impl = (async (url: string | URL) => {
    calls.push(String(url));
    return response({ resultCount: results.length, results });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function emptyMusicBrainz() {
  return (async () => response({ recordings: [] })) as unknown as typeof fetch;
}

function appleSource(overrides: Partial<AppleMusicRecord> = {}): AppleMusicRecord {
  return {
    'Song Name': 'Canyon',
    'Album Name': 'Canyon',
    'Event End Timestamp': '2026-08-01T12:34:56.000Z',
    'Media Duration In Milliseconds': '163053',
    'ISO Country': 'GB',
    'Item Type': 'ITUNES_STORE_CONTENT',
    ...overrides,
  };
}

function play(overrides: Partial<PlayRecord> = {}): PlayRecord {
  return {
    $type: 'fm.teal.feed.play',
    trackName: 'Shared Title',
    playedTime: '2026-08-01T12:34:56.000Z',
    submissionClientAgent: 'test',
    musicServiceUri: 'https://music.apple.com/',
    ...overrides,
  };
}

describe('Apple catalogue matching', () => {
  it('should reject the popular wrong song and use duration/album corroboration', async () => {
    const record = convertAppleMusicToPlayRecord(appleSource(), AGENT);
    assert.ok(record);

    const { impl, calls } = appleFetch([
      {
        kind: 'song',
        artistName: 'Wrong Popular Artist',
        trackName: 'Canyon',
        collectionName: 'Fine Line',
        trackTimeMillis: 189784,
        trackId: 1,
      },
      {
        kind: 'song',
        artistName: 'Correct Ambient Artist',
        trackName: 'Canyon',
        collectionName: 'Canyon',
        trackTimeMillis: 163100,
        trackId: 2,
      },
    ]);

    const result = await enrichWithMusicBrainz([record], {
      userAgent: AGENT,
      fetchImpl: emptyMusicBrainz(),
      appleCatalogFetchImpl: impl,
      appleCatalogRequestIntervalMs: 0,
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(result.appleEnriched, 1);
    assert.strictEqual(result.musicBrainzEnriched, 0);
    assert.strictEqual(result.records[0].artists?.[0].artistName, 'Correct Ambient Artist');
  });

  it('should accept Apple treatment suffixes only when duration corroborates them', async () => {
    const record = convertAppleMusicToPlayRecord(
      appleSource({
        'Song Name': 'Blis',
        'Album Name': '',
        'Media Duration In Milliseconds': '216048',
      }),
      AGENT,
    );
    assert.ok(record);

    const { impl } = appleFetch([
      {
        kind: 'song',
        artistName: 'Gardens of Gaia',
        trackName: 'Blis (Sleep)',
        collectionName: 'Blis',
        trackTimeMillis: 216000,
      },
    ]);

    const result = await enrichWithMusicBrainz([record], {
      userAgent: AGENT,
      fetchImpl: emptyMusicBrainz(),
      appleCatalogFetchImpl: impl,
      appleCatalogRequestIntervalMs: 0,
    });

    assert.strictEqual(result.records[0].artists?.[0].artistName, 'Gardens of Gaia');
  });

  it('should reuse one title search and rescore it for different durations', async () => {
    const { impl, calls } = appleFetch([
      {
        kind: 'song',
        artistName: 'Artist One',
        trackName: 'Shared Title',
        collectionName: 'First Album',
        trackTimeMillis: 100000,
      },
      {
        kind: 'song',
        artistName: 'Artist Two',
        trackName: 'Shared Title',
        collectionName: 'Second Album',
        trackTimeMillis: 200000,
      },
    ]);
    const client = new AppleCatalogClient({ fetchImpl: impl, requestIntervalMs: 0 });

    const first = await client.lookup(play({ releaseName: 'First Album' }), { durationMs: 100100, country: 'GB' });
    const second = await client.lookup(play({ releaseName: 'Second Album' }), { durationMs: 199900, country: 'GB' });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(first?.artistName, 'Artist One');
    assert.strictEqual(second?.artistName, 'Artist Two');
  });

  it('should refuse tied candidates with different artists', async () => {
    const { impl } = appleFetch([
      {
        kind: 'song',
        artistName: 'Artist One',
        trackName: 'Shared Title',
        trackTimeMillis: 100000,
      },
      {
        kind: 'song',
        artistName: 'Artist Two',
        trackName: 'Shared Title',
        trackTimeMillis: 100000,
      },
    ]);
    const client = new AppleCatalogClient({ fetchImpl: impl, requestIntervalMs: 0 });

    const match = await client.lookup(play(), { durationMs: 100000, country: 'GB' });
    assert.strictEqual(match, null);
  });

  it('should fail before publication when both catalogues leave an Apple artist unresolved', async () => {
    const record = convertAppleMusicToPlayRecord(
      appleSource({ 'Song Name': 'Synthetic Unresolvable Song' }),
      AGENT,
    );
    assert.ok(record);

    const { impl } = appleFetch([]);

    await assert.rejects(
      enrichWithMusicBrainz([record], {
        userAgent: AGENT,
        fetchImpl: emptyMusicBrainz(),
        appleCatalogFetchImpl: impl,
        appleCatalogRequestIntervalMs: 0,
      }),
      (error: unknown) => {
        assert.ok(error instanceof UnresolvedAppleArtistsError);
        assert.strictEqual(error.count, 1);
        assert.match(error.message, /Nothing was published/);
        return true;
      },
    );
  });
});
