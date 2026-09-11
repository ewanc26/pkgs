/**
 * Regression tests for the five diagnosed Malachite duplicate/metadata bugs.
 *
 * Each test pins a production pattern quoted in the bug report so the fix cannot
 * silently regress. The shared, environment-agnostic logic is exercised through
 * `@ewanc26/croft-click-core`; the CLI-specific wrappers are exercised through
 * `../lib/*`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canonicalizeTimestamp,
  normalizeString,
  normalizeName,
  playRecordKey,
  recordKey as recordKeyCore,
  filterNewRecords as filterNewRecordsCore,
  buildDedupPlan,
  type PlayRecord,
  type ExistingRecord,
} from '@ewanc26/croft-click-core';
import {
  convertAppleMusicToPlayRecord,
  convertSpotifyToPlayRecord,
  convertYouTubeMusicToPlayRecord,
  convertToPlayRecord,
} from '@ewanc26/croft-click-core';
import {
  createRecordKey,
  deduplicateInputRecords,
  filterNewRecords as filterNewRecordsCli,
} from '../lib/sync.js';

const AGENT = 'malachite/test';

function play(overrides: Partial<PlayRecord> = {}): PlayRecord {
  return {
    $type: 'fm.teal.feed.play',
    trackName: 'Synthetic Song',
    playedTime: '2026-08-01T12:00:00.000Z',
    submissionClientAgent: AGENT,
    musicServiceUri: 'https://music.apple.com/',
    ...overrides,
  };
}

function mkExisting(value: PlayRecord, uri = 'at://did:example:alice/fm.teal.feed.play/rkey'): ExistingRecord {
  return { uri, cid: 'bafytest', value };
}

// ─── Bug 1: timestamp-format mismatch defeats dedup ───────────────────────────

describe('Bug 1 — canonical timestamp handling', () => {
  it('collapses the production format variants onto one canonical timestamp', () => {
    // piper (`…Z`) vs malachite web (`…14.000Z`) vs an offset form — same instant.
    const variants = [
      '2026-07-17T11:39:14Z',
      '2026-07-17T11:39:14.000Z',
      '2026-07-17T11:39:14+00:00',
    ];
    const canonical = variants.map(canonicalizeTimestamp);
    assert.deepStrictEqual(new Set(canonical), new Set(['2026-07-17T11:39:14.000Z']));
  });

  it('produces identical dedup keys for the same instant in different formats', () => {
    const base = { artistName: 'Aurora', trackName: 'Runaway' } as const;
    const keys = [
      playRecordKey(play({ artists: [{ artistName: base.artistName }], trackName: base.trackName, playedTime: '2026-07-17T11:39:14Z' })),
      playRecordKey(play({ artists: [{ artistName: base.artistName }], trackName: base.trackName, playedTime: '2026-07-17T11:39:14.000Z' })),
      playRecordKey(play({ artists: [{ artistName: base.artistName }], trackName: base.trackName, playedTime: '2026-07-17T11:39:14+00:00' })),
    ];
    assert.strictEqual(keys[0], keys[1]);
    assert.strictEqual(keys[1], keys[2]);
  });

  it('collapses the same listen resubmitted in different timestamp formats', () => {
    const records = [
      play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14Z', musicServiceUri: 'https://www.last.fm/' }),
      play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://www.last.fm/' }),
      play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14+00:00', musicServiceUri: 'https://www.last.fm/' }),
    ];
    const { unique, duplicates } = deduplicateInputRecords(records);
    assert.strictEqual(unique.length, 1);
    assert.strictEqual(duplicates, 2);
  });

  it('the CLI wrapper key matches the canonical core key', () => {
    const rec = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14Z' });
    assert.strictEqual(createRecordKey(rec), recordKeyCore(rec));
    assert.strictEqual(createRecordKey(rec), playRecordKey(rec));
  });

  it('publishers emit byte-identical timestamps for the same instant', () => {
    // YouTube Music passes `r.time` through verbatim; it must now canonicalise.
    const yt = convertYouTubeMusicToPlayRecord(
      { header: 'YouTube Music', title: 'Watched Track', time: '2021-06-15T20:00:00Z', subtitles: [{ name: 'Artist' }] },
      AGENT,
    );
    assert.ok(yt);
    assert.strictEqual(yt.playedTime, '2021-06-15T20:00:00.000Z');
    assert.strictEqual(yt.playedTime, canonicalizeTimestamp('2021-06-15T20:00:00Z'));
  });
});

// ─── Bug 2: no time-window matching in the sync filter ──────────────────────────

describe('Bug 2 — window-based sync dedup', () => {
  it('drops a Spotify import within 60s of an existing Last.fm record', () => {
    const existing = new Map<string, ExistingRecord>([
      [playRecordKey(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://www.last.fm/' })),
       mkExisting(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://www.last.fm/' }))],
    ]);

    const incoming = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:40.000Z', musicServiceUri: 'https://open.spotify.com/' });

    const kept = filterNewRecordsCore([incoming], existing);
    assert.deepStrictEqual(kept, []);
  });

  it('keeps a Spotify import more than 60s after an existing Last.fm record', () => {
    const existing = new Map<string, ExistingRecord>([
      [playRecordKey(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://www.last.fm/' })),
       mkExisting(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://www.last.fm/' }))],
    ]);

    // 66s later — outside the conservative 60s window, so it is a distinct listen.
    const incoming = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:40:20.000Z', musicServiceUri: 'https://open.spotify.com/' });

    const kept = filterNewRecordsCore([incoming], existing);
    assert.deepStrictEqual(kept, [incoming]);
  });

  it('the window is configurable', () => {
    const existing = new Map<string, ExistingRecord>([
      [playRecordKey(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z' })),
       mkExisting(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z' }))],
    ]);

    const incoming = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:34.000Z' });

    // 20s gap: outside a 10s window (kept), inside a 50s window (dropped).
    assert.deepStrictEqual(filterNewRecordsCore([incoming], existing, { windowMs: 10_000 }), [incoming]);
    assert.deepStrictEqual(filterNewRecordsCore([incoming], existing, { windowMs: 50_000 }), []);
  });

  it('the CLI wrapper forwards the window option', () => {
    const existing = new Map<string, ExistingRecord>([
      [playRecordKey(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z' })),
       mkExisting(play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z' }))],
    ]);
    const incoming = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:34.000Z', musicServiceUri: 'https://open.spotify.com/' });
    // 20s gap, widened 50s window → treated as the same listen.
    assert.deepStrictEqual(filterNewRecordsCli([incoming], existing, { windowMs: 50_000 }), []);
  });
});

// ─── Bug 3: duration never populated ────────────────────────────────────────────

describe('Bug 3 — duration population', () => {
  const appleRow = {
    'Song Name': 'Canyon',
    'Album Name': 'Canyon',
    'Event End Timestamp': '2026-08-01T12:34:56.000Z',
    'Media Duration In Milliseconds': '163053',
    'ISO Country': 'GB',
    'Item Type': 'ITUNES_STORE_CONTENT',
  };

  it('Apple Music populates duration from "Media Duration In Milliseconds"', () => {
    const record = convertAppleMusicToPlayRecord(appleRow, AGENT);
    assert.ok(record);
    assert.strictEqual(record.duration, 163, '163053ms -> 163s, rounded');
    assert.strictEqual(record.playedTime, '2026-08-01T12:34:56.000Z');
  });

  it('Apple Music omits duration when media duration is absent', () => {
    const row = { ...appleRow, 'Media Duration In Milliseconds': undefined };
    const record = convertAppleMusicToPlayRecord(row, AGENT);
    assert.ok(record);
    assert.strictEqual(record.duration, undefined);
  });

  it('Spotify does not fabricate duration from ms_played (play duration is not track length)', () => {
    const record = convertSpotifyToPlayRecord({
      ts: '2021-06-15T20:00:00.000Z',
      platform: 'web',
      ms_played: 180000,
      conn_country: 'US',
      master_metadata_track_name: 'Track',
      master_metadata_album_artist_name: 'Artist',
      master_metadata_album_album_name: null,
      spotify_track_uri: null,
      episode_name: null,
      episode_show_name: null,
      spotify_episode_uri: null,
      reason_start: 'uriopen',
      reason_end: 'endplay',
      shuffle: false,
      skipped: false,
      offline: false,
      offline_timestamp: null,
      incognito_mode: false,
    }, AGENT);
    assert.ok(record);
    assert.strictEqual(record.duration, undefined);
  });
});

// ─── Bug 4: no Unicode/casing canonicalisation at ingest ───────────────────────

describe('Bug 4 — Unicode / casing normalisation', () => {
  it('case variants compare equal in dedup keys', () => {
    const a = playRecordKey(play({ artists: [{ artistName: 'DAGames' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' }));
    const b = playRecordKey(play({ artists: [{ artistName: 'Dagames' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' }));
    assert.strictEqual(a, b);
    assert.strictEqual(a, b.toLowerCase().includes('dagames') ? a : a); // sanity: key is lower-cased
    assert.ok(a.includes('dagames'));
  });

  it('strips punctuation/case so PARANOiD DJ variants collapse', () => {
    const a = playRecordKey(play({ artists: [{ artistName: 'PARANOiD DJ' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' }));
    const b = playRecordKey(play({ artists: [{ artistName: 'Paranoid DJ' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' }));
    assert.strictEqual(a, b);
  });

  it('curly vs straight apostrophe compare equal', () => {
    const curly = play({ artists: [{ artistName: 'Jack Stauber\u2019s' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' });
    const straight = play({ artists: [{ artistName: "Jack Stauber's" }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' });
    assert.strictEqual(playRecordKey(curly), playRecordKey(straight));
    assert.strictEqual(normalizeString('Jack Stauber\u2019s'), normalizeString("Jack Stauber's"));
  });

  it('non-breaking hyphen vs regular hyphen compare equal', () => {
    const nbh = play({ artists: [{ artistName: 'Bru\u2011C' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' });
    const reg = play({ artists: [{ artistName: 'Bru-C' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z' });
    assert.strictEqual(playRecordKey(nbh), playRecordKey(reg));
  });

  it('ingest NFKC normalisation collapses Unicode compatibility forms while preserving case', () => {
    // Fullwidth letters and ligatures fold to their canonical ASCII spelling …
    assert.strictEqual(normalizeName('ｇａｇａｍｅｓ'), 'gagames');
    assert.strictEqual(normalizeName('ofﬁce'), 'office');
    // … case is deliberately NOT rewritten (needs an external authority).
    assert.strictEqual(normalizeName('AURORA'), 'AURORA');
    assert.strictEqual(normalizeName('Dagames'), 'Dagames');
  });

  it('Non-ASCII punctuation equivalence is equated at the key level (Bug 4)', () => {
    // NFKC does not map a curly apostrophe to ASCII, but the dedup key strips
    // punctuation — so both spellings still collapse to one key for matching.
    assert.strictEqual(normalizeString('Jack Stauber\u2019s'), normalizeString("Jack Stauber's"));
    assert.strictEqual(normalizeString('Bru\u2011C'), normalizeString('Bru-C'));
    // And so does ingest-level NFKC for the compatibility-hyphen form.
    assert.strictEqual(normalizeName('Bru\u2011C'), 'Bru-C'.replace(/-/, '\u2010'));
  });

  it('Last.fm conversion preserves a real multibyte track name under NFKC', () => {
    const lb = convertToPlayRecord({
      uts: '1549854160',
      utc_time: '2019-02-11T20:02:40Z',
      artist: '物語シリーズ',
      artist_mbid: '',
      album: 'Bakemonogatari',
      album_mbid: '',
      track: '次回、ひたぎクラブ',
      track_mbid: '',
    }, AGENT);
    assert.strictEqual(lb.trackName, '次回、ひたぎクラブ');
    assert.strictEqual(lb.artists?.[0].artistName, '物語シリーズ');
    assert.strictEqual(lb.playedTime, new Date(1549854160 * 1000).toISOString());
  });
});

// ─── Bug 5: historical one-time cleanup ────────────────────────────────────────

describe('Bug 5 — historical deduplicate plan', () => {
  it('groups Bug 1 format variants and Bug 4 spelling variants, keeping the richer record', () => {
    const lastfm = play({ artists: [{ artistName: 'Aurora', artistMbId: 'mbid:6897b46a-9236-4480-9ed7-300f6b85d62f' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14Z', musicServiceUri: 'https://www.last.fm/', recordingMbId: 'mbid:rec-1' });
    const lastfmMs = play({ artists: [{ artistName: 'Aurora', artistMbId: 'mbid:6897b46a-9236-4480-9ed7-300f6b85d62f' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://www.last.fm/', recordingMbId: 'mbid:rec-1' });
    const spotify = play({ artists: [{ artistName: 'AURORA' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:40.000Z', musicServiceUri: 'https://open.spotify.com/' });

    const plan = buildDedupPlan([mkExisting(lastfm, 'r1'), mkExisting(lastfmMs, 'r2'), mkExisting(spotify, 'r3')]);

    assert.strictEqual(plan.totalDuplicates, 2);
    assert.strictEqual(plan.groups.length, 1);
    const group = plan.groups[0];
    // The Last.fm record (MBIDs present) is richer than the Spotify copy, so it
    // is the keeper; both the `14Z`/`14.000Z` variant and the Spotify copy fall.
    assert.strictEqual(group.keep.value.recordingMbId, 'mbid:rec-1');
    assert.deepStrictEqual(group.remove.map((r) => r.uri), ['r2', 'r3']);
  });

  it('prefers the record with MBIDs over a plain Spotify copy', () => {
    const spotify = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://open.spotify.com/' });
    const lastfm = play({ artists: [{ artistName: 'Aurora', artistMbId: 'mbid:6897b46a-9236-4480-9ed7-300f6b85d62f' }], trackName: 'Runaway', playedTime: '2026-07-17T11:39:14.000Z', musicServiceUri: 'https://www.last.fm/', recordingMbId: 'mbid:rec-1' });

    const plan = buildDedupPlan([mkExisting(spotify, 's1'), mkExisting(lastfm, 's2')]);

    assert.strictEqual(plan.totalDuplicates, 1);
    assert.strictEqual(plan.groups[0].keep.value.musicServiceUri, 'https://www.last.fm/');
    assert.strictEqual(plan.groups[0].remove.length, 1);
    assert.strictEqual(plan.groups[0].remove[0].uri, 's1');
  });

  it('keeps records that are >60s apart as separate listens', () => {
    const a = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:00:00.000Z', musicServiceUri: 'https://www.last.fm/' });
    const b = play({ artists: [{ artistName: 'Aurora' }], trackName: 'Runaway', playedTime: '2026-07-17T11:01:05.000Z', musicServiceUri: 'https://open.spotify.com/' }); // 65s later

    const plan = buildDedupPlan([mkExisting(a, 'a'), mkExisting(b, 'b')]);
    assert.strictEqual(plan.totalDuplicates, 0);
    assert.strictEqual(plan.groups.length, 0);
  });

  it('is a pure read-only analysis — no mutation of inputs', () => {
    const a = play({ artists: [{ artistName: 'Dagames' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z', musicServiceUri: 'https://www.last.fm/' });
    const b = play({ artists: [{ artistName: 'DAGames' }], trackName: 'Track', playedTime: '2026-01-01T00:00:00Z', musicServiceUri: 'https://open.spotify.com/' });
    const snapshot = (r: PlayRecord) => JSON.stringify(r);
    const before = [a, b].map(snapshot);

    const plan = buildDedupPlan([mkExisting(a, 'a'), mkExisting(b, 'b')]);
    assert.strictEqual(plan.totalDuplicates, 1);
    assert.deepStrictEqual([a, b].map(snapshot), before);
  });
});
