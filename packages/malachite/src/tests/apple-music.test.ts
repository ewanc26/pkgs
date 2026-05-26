import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseAppleMusicCsv,
  convertAppleMusicToPlayRecord,
} from '../lib/apple-music.js';
import type { Config } from '../types.js';

const mockConfig: Config = {
  RECORD_TYPE: 'fm.teal.alpha.feed.play',
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

  it('should filter out invalid records', () => {
    const csvData = `"Artist Name","Content Name","Event End Timestamp"
"Artist One","Track One","2021-06-15T20:00:00Z"
"","Track Two","2021-06-15T20:05:00Z"
"Artist Three","","2021-06-15T20:10:00Z"
"Artist Four","Track Four",""`;

    const filePath = path.join(tempDir, 'Apple_Music_Play_Activity.csv');
    fs.writeFileSync(filePath, csvData);

    const records = parseAppleMusicCsv(filePath);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0]['Content Name'], 'Track One');
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

    assert.strictEqual(playRecord.trackName, 'Test Track');
    assert.strictEqual(playRecord.artists[0].artistName, 'Test Artist');
    assert.strictEqual(playRecord.playedTime, '2021-06-15T20:00:00.000Z');
    assert.strictEqual(playRecord.musicServiceBaseDomain, 'music.apple.com');
  });
});
