/**
 * Cross-source merge behaviour, pinned from a real history where Last.fm,
 * Spotify and Apple Music exports overlapped (end-time vs start-time stamps).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mergePlayRecords,
  deduplicateInputRecords,
  filterNewRecords,
  normalizeString,
  sourceOf,
  type PlayRecord,
  type ExistingRecord,
} from '@ewanc26/croft-click-core';

function rec(trackName: string, playedTime: string, service: string, artist = 'Artist'): PlayRecord {
  return {
    $type: 'fm.teal.feed.play',
    trackName,
    artists: [{ artistName: artist }],
    playedTime,
    submissionClientAgent: 'malachite/test',
    musicServiceUri: service,
  };
}

const LASTFM = 'https://www.last.fm';
const SPOTIFY = 'https://open.spotify.com';

describe('mergePlayRecords — cross-source window', () => {
  it('merges a Last.fm start time with a Spotify end time ~3-4 minutes later', () => {
    const { merged, stats } = mergePlayRecords(
      [rec('Song', '2025-03-01T10:00:00Z', LASTFM)],
      [rec('Song', '2025-03-01T10:03:40Z', SPOTIFY)]
    );
    assert.strictEqual(merged.length, 1);
    assert.strictEqual(stats.duplicatesRemoved, 1);
  });

  it('merges long tracks whose start/end offset exceeds five minutes', () => {
    const { merged } = mergePlayRecords(
      [rec('Long', '2025-03-01T10:00:00Z', LASTFM)],
      [rec('Long', '2025-03-01T10:08:00Z', SPOTIFY)]
    );
    assert.strictEqual(merged.length, 1);
  });

  it('keeps genuine repeats from a single source', () => {
    const spotify = [
      rec('Loop', '2025-03-01T10:00:00Z', SPOTIFY),
      rec('Loop', '2025-03-01T10:03:00Z', SPOTIFY),
      rec('Loop', '2025-03-01T10:06:00Z', SPOTIFY),
    ];
    const { merged } = mergePlayRecords([], spotify);
    assert.strictEqual(merged.length, 3);
  });

  it('matches one-to-one: three Spotify repeats keep their three Last.fm twins as three plays', () => {
    const spotify = [
      rec('Loop', '2025-03-01T10:03:00Z', SPOTIFY),
      rec('Loop', '2025-03-01T10:06:00Z', SPOTIFY),
      rec('Loop', '2025-03-01T10:09:00Z', SPOTIFY),
    ];
    const lastfm = [
      rec('Loop', '2025-03-01T10:00:00Z', LASTFM),
      rec('Loop', '2025-03-01T10:03:00Z', LASTFM),
      rec('Loop', '2025-03-01T10:06:00Z', LASTFM),
    ];
    const { merged } = mergePlayRecords(lastfm, spotify);
    assert.strictEqual(merged.length, 3);
  });

  it('does not merge different tracks or plays far apart', () => {
    const { merged } = mergePlayRecords(
      [rec('A', '2025-03-01T10:00:00Z', LASTFM), rec('Same', '2025-03-01T10:00:00Z', LASTFM)],
      [rec('B', '2025-03-01T10:02:00Z', SPOTIFY), rec('Same', '2025-03-01T14:00:00Z', SPOTIFY)]
    );
    assert.strictEqual(merged.length, 4);
  });

  it('keeps distinct non-Latin tracks by the same artist apart', () => {
    const { merged } = mergePlayRecords(
      [rec('怪物', '2025-03-01T10:00:00Z', LASTFM, 'YOASOBI')],
      [rec('夜に駆ける', '2025-03-01T10:02:00Z', SPOTIFY, 'YOASOBI')]
    );
    assert.strictEqual(merged.length, 2);
  });
});

describe('normalizeString — Unicode', () => {
  it('preserves non-Latin letters', () => {
    assert.strictEqual(normalizeString('怪物'), '怪物');
    assert.notStrictEqual(normalizeString('怪物'), normalizeString('夜に駆ける'));
  });
});

describe('deduplicateInputRecords — near-simultaneous events', () => {
  it('collapses the same track emitted twice within a few seconds', () => {
    const { unique, duplicates } = deduplicateInputRecords([
      rec('Song', '2026-08-01T12:00:00.000Z', 'https://music.apple.com/'),
      rec('Song', '2026-08-01T12:00:00.250Z', 'https://music.apple.com/'),
      rec('Song', '2026-08-01T12:00:03Z', 'https://music.apple.com/'),
    ]);
    assert.strictEqual(unique.length, 1);
    assert.strictEqual(duplicates, 2);
  });

  it('keeps real repeats minutes apart', () => {
    const { unique } = deduplicateInputRecords([
      rec('Song', '2026-08-01T12:00:00Z', 'https://music.apple.com/'),
      rec('Song', '2026-08-01T12:03:00Z', 'https://music.apple.com/'),
    ]);
    assert.strictEqual(unique.length, 2);
  });
});

describe('mergePlayRecords — Apple import vs live', () => {
  it('collapses an Apple import and a live Apple row for the same listen', () => {
    const APPLE = 'https://music.apple.com';
    const imported: PlayRecord = { ...rec('Song', '2026-08-01T10:00:00Z', APPLE), submissionClientAgent: 'malachite/0.19.10' };
    const live: PlayRecord = { ...rec('Song', '2026-08-01T10:02:50Z', APPLE), submissionClientAgent: 'piper/0.1.1' };
    const { merged, stats } = mergePlayRecords([], [], [imported, live]);
    assert.strictEqual(merged.length, 1);
    assert.strictEqual(stats.duplicatesRemoved, 1);
  });
});

describe('filterNewRecords — cross-source and wide windows', () => {
  const existingMap = (...recs: PlayRecord[]) =>
    new Map<string, ExistingRecord>(
      recs.map((r, i) => [`k${i}`, { uri: `at://did:x/fm.teal.feed.play/${i}`, cid: `c${i}`, value: r }])
    );

  it('drops an incoming Last.fm row whose Spotify twin is already on the PDS', () => {
    const out = filterNewRecords(
      [rec('Song', '2025-03-01T10:00:00Z', LASTFM)],
      existingMap(rec('Song', '2025-03-01T10:03:40Z', SPOTIFY))
    );
    assert.strictEqual(out.length, 0);
  });

  it('is one-to-one: a second Last.fm play is kept when only one Spotify twin exists', () => {
    const out = filterNewRecords(
      [rec('Loop', '2025-03-01T10:00:00Z', LASTFM), rec('Loop', '2025-03-01T10:07:00Z', LASTFM)],
      existingMap(rec('Loop', '2025-03-01T10:03:30Z', SPOTIFY))
    );
    assert.strictEqual(out.length, 1);
  });

  it('recognises sources from musicServiceBaseDomain / originUrl on newer records', () => {
    const live: PlayRecord = {
      ...rec('Song', '2026-08-01T12:00:00Z', ''),
      musicServiceUri: undefined as unknown as string,
      musicServiceBaseDomain: 'music.apple.com',
    };
    assert.strictEqual(sourceOf(live), 'apple');
    assert.strictEqual(sourceOf({ ...live, musicServiceBaseDomain: 'spotify.com' }), 'spotify');
    assert.strictEqual(sourceOf({ ...live, musicServiceBaseDomain: undefined, originUrl: 'https://www.last.fm/x' }), 'lastfm');
  });

  it('honours windowMs above 60 seconds', () => {
    const existing = existingMap(rec('Song', '2025-03-01T10:00:00Z', SPOTIFY));
    const incoming = [rec('Song', '2025-03-01T10:03:00Z', SPOTIFY)];
    assert.strictEqual(filterNewRecords(incoming, existing, { crossSourceWindowMs: 0 }).length, 1);
    assert.strictEqual(filterNewRecords(incoming, existing, { windowMs: 300_000, crossSourceWindowMs: 0 }).length, 0);
  });

  it('matches an Apple import against a live Apple record of the same listen', () => {
    const APPLE = 'https://music.apple.com';
    const live: PlayRecord = { ...rec('Song', '2026-08-01T10:02:30Z', APPLE), submissionClientAgent: 'piper/0.1.1' };
    const imported: PlayRecord = { ...rec('Song', '2026-08-01T10:00:00Z', APPLE), submissionClientAgent: 'malachite/0.19.10' };
    assert.strictEqual(filterNewRecords([imported], existingMap(live)).length, 0);
  });

  it('can disable the cross-source tier', () => {
    const out = filterNewRecords(
      [rec('Song', '2025-03-01T10:00:00Z', LASTFM)],
      existingMap(rec('Song', '2025-03-01T10:03:40Z', SPOTIFY)),
      { crossSourceWindowMs: 0 }
    );
    assert.strictEqual(out.length, 1);
  });
});
