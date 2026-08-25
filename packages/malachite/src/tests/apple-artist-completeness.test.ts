import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AppleCatalogClient,
  convertAppleMusicToPlayRecord,
  enrichWithMusicBrainz,
  parseAppleMusicCsvContent,
  parseDailyTracksArtistMap,
  sanitizePlayRecordMusicBrainzIds,
  type AppleMusicRecord,
  type PlayRecord,
} from '@ewanc26/croft-click-core';

function appleSearchResponse(results: Array<Record<string, unknown>>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ resultCount: results.length, results }),
  } as unknown as Response;
}

describe('Apple artist completeness', () => {
  it('should resolve repeated lagging-companion plays with one Apple catalogue lookup', async () => {
    const source = (playedTime: string): AppleMusicRecord => ({
      'Song Name': 'Blis',
      'Album Name': 'Blis',
      'Event End Timestamp': playedTime,
      'Media Duration In Milliseconds': '216000',
      'ISO Country': 'GB',
      'Item Type': 'ITUNES_STORE_CONTENT',
    });

    const records = [
      convertAppleMusicToPlayRecord(source('2026-08-21T01:00:00Z'), 'test/1'),
      convertAppleMusicToPlayRecord(source('2026-08-22T01:00:00Z'), 'test/1'),
    ].filter((record): record is PlayRecord => record !== null);

    const appleCalls: string[] = [];
    const appleFetch = (async (url: string | URL) => {
      appleCalls.push(String(url));
      return appleSearchResponse([
        {
          kind: 'song',
          artistName: 'Gardens of Gaia',
          trackName: 'Blis (Sleep)',
          collectionName: 'Blis',
          trackTimeMillis: 216000,
          trackId: 6784820954,
        },
      ]);
    }) as unknown as typeof fetch;

    let musicBrainzCalls = 0;
    const musicBrainzFetch = (async () => {
      musicBrainzCalls++;
      return {
        ok: true,
        status: 200,
        json: async () => ({ recordings: [] }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const result = await enrichWithMusicBrainz(records, {
      userAgent: 'malachite-test/1 ( https://example.invalid )',
      fetchImpl: musicBrainzFetch,
      appleCatalogFetchImpl: appleFetch,
      appleCatalogRequestIntervalMs: 0,
    });

    assert.strictEqual(appleCalls.length, 1, 'repeated plays should share one catalogue lookup');
    assert.strictEqual(musicBrainzCalls, 0, 'Apple-resolved rows should never reach MusicBrainz');
    assert.strictEqual(result.appleEnriched, 2);
    assert.strictEqual(result.musicBrainzEnriched, 0);
    assert.strictEqual(result.unresolvedApple, 0);
    assert.deepStrictEqual(
      result.records.map((record) => record.artists?.[0]?.artistName),
      ['Gardens of Gaia', 'Gardens of Gaia'],
    );
  });

  it('should reject a tied Apple catalogue match with different artists', async () => {
    const fetchImpl = (async () => appleSearchResponse([
      {
        kind: 'song',
        artistName: 'Artist One',
        trackName: 'Shared Title',
        collectionName: 'Shared Album',
        trackTimeMillis: 180000,
      },
      {
        kind: 'song',
        artistName: 'Artist Two',
        trackName: 'Shared Title',
        collectionName: 'Shared Album',
        trackTimeMillis: 180000,
      },
    ])) as unknown as typeof fetch;

    const client = new AppleCatalogClient({ fetchImpl, requestIntervalMs: 0 });
    const match = await client.lookup(
      {
        $type: 'fm.teal.feed.play',
        trackName: 'Shared Title',
        releaseName: 'Shared Album',
        playedTime: '2026-08-20T12:00:00.000Z',
        submissionClientAgent: 'test',
        musicServiceUri: 'https://music.apple.com/',
      },
      { durationMs: 180000, country: 'GB' },
    );

    assert.strictEqual(match, null);
  });

  it('should not trust an ambiguous Daily Tracks title', () => {
    const artists = parseDailyTracksArtistMap([
      { 'Track Description': 'Artist One - Shared Title' },
      { 'Track Description': 'Artist Two - Shared Title' },
    ]);

    assert.strictEqual(artists.has('shared title'), false);
  });

  it('should filter zero-duration stream metadata out of Play Activity', () => {
    const rows: AppleMusicRecord[] = [
      {
        'Song Name': 'Apple Music 1',
        'Event End Timestamp': '2026-08-20T12:00:00Z',
        'Item Type': 'STREAM',
        'Event Type': 'TIMED_METADATA_PING',
        'Media Duration In Milliseconds': '0',
      },
      {
        'Song Name': 'Real Song',
        'Event End Timestamp': '2026-08-20T12:04:00Z',
        'Item Type': 'ITUNES_STORE_CONTENT',
        'Media Duration In Milliseconds': '240000',
      },
    ];

    const parsed = parseAppleMusicCsvContent(rows);
    assert.deepStrictEqual(parsed.map((row) => row['Song Name']), ['Real Song']);
  });

  it('should refuse to publish an unresolved Apple artist gap', () => {
    assert.throws(
      () => sanitizePlayRecordMusicBrainzIds({
        $type: 'fm.teal.feed.play',
        trackName: 'Unresolved Song',
        playedTime: '2026-08-20T12:00:00.000Z',
        submissionClientAgent: 'test',
        musicServiceUri: 'https://music.apple.com/',
      }),
      /Refusing to publish Apple Music play without an artist/,
    );
  });

  it('should allow an Apple play once a real artist is present', () => {
    const sanitized = sanitizePlayRecordMusicBrainzIds({
      $type: 'fm.teal.feed.play',
      trackName: 'Resolved Song',
      artists: [{ artistName: 'Real Artist' }],
      playedTime: '2026-08-20T12:00:00.000Z',
      submissionClientAgent: 'test',
      musicServiceUri: 'https://music.apple.com/',
    });

    assert.strictEqual(sanitized.artists?.[0]?.artistName, 'Real Artist');
  });
});
