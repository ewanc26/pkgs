import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseAppleMusicCsv,
  convertAppleMusicToPlayRecord,
} from '../lib/apple-music.js';
import { parseDailyTracksArtistMap } from '@ewanc26/croft-click-core';
import type { Config } from '../types.js';

const mockConfig: Config = {
  RECORD_TYPE: 'fm.teal.feed.play',
  MIN_RECORDS_FOR_SCALING: 20,
  BASE_BATCH_SIZE: 200,
  MAX_BATCH_SIZE: 200,
  SCALING_FACTOR: 1.5,
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_BATCH_DELAY: 2000,
  MIN_BATCH_DELAY: 1000,
  RECORDS_PER_DAY_LIMIT: 10000,
  SAFETY_MARGIN: 0.75,
  AGGRESSIVE_SAFETY_MARGIN: 0.85,
  SLINGSHOT_RESOLVER: 'https://slingshot.microcosm.blue',
};

describe('Apple Music CSV Parsing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apple-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should parse single Apple Music CSV file', () => {
    const csvData = `"Apple ID Number","Apple Music Subscription","Artist Name","Build Version","Client IP Address","Content Name","Content Provider","Content Specific Type","Content Type","Device Identifier","End Position In Milliseconds","End Reason Type","Event End Timestamp","Event Reason Hint Type","Event Received Timestamp","Event Start Timestamp","Event Type","Feature Name","Genre","Hours Since Local Midnight","Is Offline","Metrics Bucket Id","Metrics Client Id","Milliseconds Since Play","Offline Timestamp","Play Duration Milliseconds","Provided Audio Format","Session Is Shared","Source Type","Start Position In Milliseconds","Store Country Name","Storefront Id","User agent OS"
"123","true","Artist One","1.0","127.0.0.1","Track One","Provider","Type","Type","Dev","180000","Natural","2021-06-15T20:00:00Z","","","2021-06-15T19:57:00Z","Play","","Pop","20","false","","","","","180000","","false","","0","US","1","iOS"`;

    const filePath = path.join(tempDir, 'Apple_Music_Play_Activity.csv');
    fs.writeFileSync(filePath, csvData);

    const records = parseAppleMusicCsv(filePath);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0]['Content Name'], 'Track One');
    assert.strictEqual(records[0]['Artist Name'], 'Artist One');
  });

  it('should filter out records with no title or no timestamp', () => {
    // A missing artist is not disqualifying — current exports have no artist
    // column at all, so it's resolved during conversion or simply left unset.
    // Title and timestamp are still required, since without them a row isn't
    // a play.
    const csvData = `"Artist Name","Content Name","Event End Timestamp"
"Artist One","Track One","2021-06-15T20:00:00Z"
"","Track Two","2021-06-15T20:05:00Z"
"Artist Three","","2021-06-15T20:10:00Z"
"Artist Four","Track Four",""`;

    const filePath = path.join(tempDir, 'Apple_Music_Play_Activity.csv');
    fs.writeFileSync(filePath, csvData);

    const records = parseAppleMusicCsv(filePath);
    assert.deepStrictEqual(
      records.map((r) => r['Content Name']),
      ['Track One', 'Track Two']
    );
  });

  it('should reject the daily-totals CSV with a message naming the right file', () => {
    // The shape of "Apple Music - Play History Daily Tracks.csv", which sits
    // next to the real export and is easy to grab by mistake. It has none of
    // the columns we read, so previously it imported as silently zero records.
    const csvData = `"Date Played","Track Description","Play Duration Milliseconds","Media type","Country"
"20210615","Artist One - Track One","180000","AUDIO","US"`;

    const filePath = path.join(tempDir, 'Apple Music - Play History Daily Tracks.csv');
    fs.writeFileSync(filePath, csvData);

    assert.throws(
      () => parseAppleMusicCsv(filePath),
      (err: Error) => {
        assert.strictEqual(err.name, 'AppleMusicSchemaError');
        assert.match(err.message, /Apple Music Play Activity\.csv/);
        return true;
      }
    );
  });

  it('should not throw on an empty CSV (no headers to judge)', () => {
    const filePath = path.join(tempDir, 'Apple Music Play Activity.csv');
    fs.writeFileSync(filePath, '');

    assert.strictEqual(parseAppleMusicCsv(filePath).length, 0);
  });
});

describe('Apple Music Record Conversion', () => {
  it('should convert Apple Music record to PlayRecord', () => {
    const appleRecord = {
      'Content Name': 'Test Track',
      'Artist Name': 'Test Artist',
      'Event End Timestamp': '2021-06-15T20:00:00Z'
    };

    const playRecord = convertAppleMusicToPlayRecord(appleRecord, mockConfig);

    assert.ok(playRecord);
    assert.strictEqual(playRecord.trackName, 'Test Track');
    assert.strictEqual(playRecord.artists?.[0].artistName, 'Test Artist');
    assert.strictEqual(playRecord.playedTime, '2021-06-15T20:00:00.000Z');
    assert.strictEqual(playRecord.musicServiceUri, 'https://music.apple.com/');
  });

  it('should read the modern "Song Name" column', () => {
    // Current exports renamed Content Name -> Song Name and dropped Artist Name.
    const playRecord = convertAppleMusicToPlayRecord(
      {
        'Song Name': 'Modern Track',
        'Container Artist Name': 'Container Artist',
        'Event End Timestamp': '2026-01-02T03:04:05Z',
      },
      mockConfig
    );

    assert.ok(playRecord);
    assert.strictEqual(playRecord.trackName, 'Modern Track');
    assert.strictEqual(playRecord.artists?.[0].artistName, 'Container Artist');
  });

  it('should keep a play whose artist is unknown, omitting artists', () => {
    // fm.teal.feed.play requires only trackName, so the play is still imported.
    // The field is left off rather than filled with a fabricated name.
    const playRecord = convertAppleMusicToPlayRecord(
      { 'Song Name': 'Orphan Track', 'Event End Timestamp': '2026-01-02T03:04:05Z' },
      mockConfig
    );

    assert.ok(playRecord);
    assert.strictEqual(playRecord.trackName, 'Orphan Track');
    assert.ok(!('artists' in playRecord));
  });

  it('should recover the artist from the daily-tracks lookup', () => {
    const lookup = parseDailyTracksArtistMap([
      { 'Track Description': 'Recovered Artist - Orphan Track', 'Play Count': '3' },
    ]);

    const playRecord = convertAppleMusicToPlayRecord(
      { 'Song Name': 'Orphan Track', 'Event End Timestamp': '2026-01-02T03:04:05Z' },
      mockConfig,
      false,
      lookup
    );

    assert.ok(playRecord);
    assert.strictEqual(playRecord.artists?.[0].artistName, 'Recovered Artist');
  });
});

describe('Apple Music Daily Tracks artist lookup', () => {
  it('should split "Artist - Title" on the first separator', () => {
    const map = parseDailyTracksArtistMap([
      { 'Track Description': 'Artist - Song - Live Version' },
    ]);

    // Title keeps the rest, so a hyphenated title still resolves.
    assert.strictEqual(map.get('song - live version'), 'Artist');
  });

  it('should match titles regardless of case and the "- Single" suffix', () => {
    const map = parseDailyTracksArtistMap([{ 'Track Description': 'Artist - Stargirl' }]);

    assert.strictEqual(map.get('stargirl'), 'Artist');
  });

  it('should ignore rows with no usable description', () => {
    const map = parseDailyTracksArtistMap([
      { 'Track Description': '' },
      { 'Track Description': 'NoSeparatorHere' },
      { 'Play Count': '1' },
    ]);

    assert.strictEqual(map.size, 0);
  });
});
