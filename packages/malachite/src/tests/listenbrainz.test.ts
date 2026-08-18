/**
 * Tests for ListenBrainz export parsing and conversion.
 *
 * The records below are taken verbatim from real exports: the teal lexicon
 * declares every MusicBrainz field as `format: uri` (`mbid:<uuid>`), but
 * ListenBrainz emits bare UUIDs, which the PDS rejected with
 * `Invalid field 'releaseMbId': invalid format: Uri` — failing the entire
 * applyWrites batch, not just the offending record.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { zipSync, strToU8 } from 'fflate';
import { parseListenBrainzJsonContent } from '../lib/listenbrainz.js';
import {
  convertListenBrainzToPlayRecord,
  parseListenBrainzArchive,
  parseListenBrainzJsonContents,
  isListenBrainzDataFile,
} from '@ewanc26/croft-click-core';
import type { ListenBrainzRecord } from '@ewanc26/croft-click-core';

const AGENT = 'malachite/test';

/** A listen ListenBrainz has matched against MusicBrainz. */
const MAPPED: ListenBrainzRecord = {
  listened_at: 1785588557,
  track_metadata: {
    track_name: 'Delete',
    artist_name: 'Ninajirachi',
    mbid_mapping: {
      artists: [
        { artist_mbid: '6897b46a-9236-4480-9ed7-300f6b85d62f', artist_credit_name: 'Ninajirachi' },
      ],
      artist_mbids: ['6897b46a-9236-4480-9ed7-300f6b85d62f'],
      release_mbid: '167fe8d9-402e-431b-964e-adae7d483675',
      recording_mbid: '1acda0b9-4e9a-429d-90a5-89f1daa16291',
      recording_name: 'Delete',
    },
    release_name: 'I Love My Computer',
    additional_info: {
      origin_url: 'https://open.spotify.com/track/0CVbCtcdXAIw00YBXXbneu',
      music_service: 'spotify.com',
    },
  },
};

/** A matched listen whose release is unknown — release_mbid is explicitly null. */
const PARTIALLY_MAPPED: ListenBrainzRecord = {
  listened_at: 1785588324,
  track_metadata: {
    track_name: 'WannaCry',
    artist_name: 'Ninajirachi, Porter Robinson',
    mbid_mapping: {
      artists: [
        { artist_mbid: '6897b46a-9236-4480-9ed7-300f6b85d62f', artist_credit_name: 'Ninajirachi' },
        { artist_mbid: '4ae36ade-1798-48c4-b06b-cc68b7d3d83f', artist_credit_name: 'Porter Robinson' },
      ],
      release_mbid: null,
      recording_mbid: '83913e5d-d726-4619-9768-657a980687a6',
    },
    release_name: 'WannaCry',
  },
};

/** An unmatched listen — mbid_mapping is null, as in older scrobbles. */
const UNMAPPED: ListenBrainzRecord = {
  listened_at: 1549854160,
  track_metadata: {
    track_name: '次回、ひたぎクラブ',
    artist_name: '物語シリーズ',
    mbid_mapping: null,
    release_name: 'Bakemonogatari Gekihanongakushu',
    additional_info: { submission_client: 'scotty' } as never,
  },
};

describe('ListenBrainz MusicBrainz ID conversion', () => {
  it('emits MBIDs as mbid: URIs, not bare UUIDs', () => {
    const record = convertListenBrainzToPlayRecord(MAPPED, AGENT);

    assert.strictEqual(record.releaseMbId, 'mbid:167fe8d9-402e-431b-964e-adae7d483675');
    assert.strictEqual(record.recordingMbId, 'mbid:1acda0b9-4e9a-429d-90a5-89f1daa16291');
    assert.strictEqual(record.artists[0].artistMbId, 'mbid:6897b46a-9236-4480-9ed7-300f6b85d62f');
  });

  it('omits a null release_mbid rather than emitting an invalid value', () => {
    const record = convertListenBrainzToPlayRecord(PARTIALLY_MAPPED, AGENT);

    assert.ok(!('releaseMbId' in record), 'releaseMbId should be absent');
    assert.strictEqual(record.recordingMbId, 'mbid:83913e5d-d726-4619-9768-657a980687a6');
    assert.strictEqual(record.artists.length, 2);
    assert.strictEqual(record.artists[1].artistMbId, 'mbid:4ae36ade-1798-48c4-b06b-cc68b7d3d83f');
  });

  it('handles a null mbid_mapping without inventing MBID fields', () => {
    const record = convertListenBrainzToPlayRecord(UNMAPPED, AGENT);

    assert.strictEqual(record.trackName, '次回、ひたぎクラブ');
    assert.strictEqual(record.artists[0].artistName, '物語シリーズ');
    assert.ok(!('releaseMbId' in record));
    assert.ok(!('recordingMbId' in record));
    assert.ok(!('artistMbId' in record.artists[0]));
  });

  it('never emits an MBID field set to undefined', () => {
    // applyWrites encodes records as CBOR; an explicitly-undefined optional
    // field is not the same as an absent one.
    for (const input of [MAPPED, PARTIALLY_MAPPED, UNMAPPED]) {
      const record = convertListenBrainzToPlayRecord(input, AGENT) as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        assert.notStrictEqual(value, undefined, `${key} should be omitted, not undefined`);
      }
    }
  });

  it('keeps the rest of the record intact', () => {
    const record = convertListenBrainzToPlayRecord(MAPPED, AGENT);

    assert.strictEqual(record.trackName, 'Delete');
    assert.strictEqual(record.releaseName, 'I Love My Computer');
    assert.strictEqual(record.playedTime, new Date(1785588557 * 1000).toISOString());
    assert.strictEqual(record.submissionClientAgent, AGENT);
    assert.strictEqual(record.musicServiceUri, 'https://spotify.com/');
    assert.strictEqual(record.originUri, 'https://open.spotify.com/track/0CVbCtcdXAIw00YBXXbneu');
  });
});

describe('ListenBrainz export parsing', () => {
  it('parses the NDJSON that per-month export files use', () => {
    const content = [JSON.stringify(MAPPED), JSON.stringify(UNMAPPED)].join('\n');
    assert.strictEqual(parseListenBrainzJsonContent(content).length, 2);
  });

  it('parses a plain JSON array', () => {
    assert.strictEqual(parseListenBrainzJsonContent(JSON.stringify([MAPPED])).length, 1);
  });

  it('parses the API envelope shapes', () => {
    assert.strictEqual(parseListenBrainzJsonContent(JSON.stringify({ listens: [MAPPED] })).length, 1);
    assert.strictEqual(
      parseListenBrainzJsonContent(JSON.stringify({ payload: { listens: [MAPPED] } })).length,
      1,
    );
  });

  it('skips malformed lines instead of throwing', () => {
    const content = [JSON.stringify(MAPPED), 'not json', '', '{"listened_at": 1}'].join('\n');
    assert.strictEqual(parseListenBrainzJsonContent(content).length, 1);
  });

  it('concatenates the per-month files of an export', () => {
    const months = [
      JSON.stringify(MAPPED),
      [JSON.stringify(PARTIALLY_MAPPED), JSON.stringify(UNMAPPED)].join('\n'),
    ];
    assert.strictEqual(parseListenBrainzJsonContents(months).length, 3);
  });
});

describe('ListenBrainz archive import', () => {
  /** The layout a real ListenBrainz export .zip ships with. */
  function buildExportZip(): Uint8Array {
    return zipSync({
      'listens/2026/1.jsonl': strToU8(JSON.stringify(MAPPED)),
      'listens/2026/2.jsonl': strToU8(
        [JSON.stringify(PARTIALLY_MAPPED), JSON.stringify(UNMAPPED)].join('\n'),
      ),
      'feedback.jsonl': strToU8('{"recording_msid": "x", "score": 1}'),
      'user.json': strToU8('{"user_name": "someone"}'),
    });
  }

  it('reads every listens file out of the export zip', () => {
    const records = parseListenBrainzArchive(buildExportZip());
    assert.strictEqual(records.length, 3);
  });

  it('ignores the non-listen files shipped alongside', () => {
    const records = parseListenBrainzArchive(buildExportZip());
    const names = records.map((r) => r.track_metadata.track_name);
    assert.deepStrictEqual(names.sort(), ['Delete', 'WannaCry', '次回、ひたぎクラブ'].sort());
  });

  it('falls back to plain parsing for non-zip bytes', () => {
    const bytes = strToU8(JSON.stringify([MAPPED, UNMAPPED]));
    assert.strictEqual(parseListenBrainzArchive(bytes).length, 2);
  });

  it('recognises which export files can hold listens', () => {
    assert.ok(isListenBrainzDataFile('listens/2026/1.jsonl'));
    assert.ok(isListenBrainzDataFile('export.json'));
    assert.ok(!isListenBrainzDataFile('user.json'));
    assert.ok(!isListenBrainzDataFile('feedback.jsonl'));
    assert.ok(!isListenBrainzDataFile('README.txt'));
  });
});
