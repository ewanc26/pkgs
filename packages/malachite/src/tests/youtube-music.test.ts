import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseYouTubeMusicJson,
  convertYouTubeMusicToPlayRecord,
} from '../lib/youtube-music.js';
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

describe('YouTube Music JSON Parsing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtube-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should parse single YouTube Music JSON file', () => {
    const youtubeData = [
      {
        header: 'YouTube Music',
        title: 'Watched Track One',
        subtitles: [{ name: 'Artist One' }],
        time: '2021-06-15T20:00:00Z'
      }
    ];

    const filePath = path.join(tempDir, 'watch-history.json');
    fs.writeFileSync(filePath, JSON.stringify(youtubeData));

    const records = parseYouTubeMusicJson(filePath);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].title, 'Watched Track One');
    assert.strictEqual(records[0].subtitles![0].name, 'Artist One');
  });

  it('should filter out non-music records', () => {
    const youtubeData = [
      {
        header: 'YouTube Music',
        title: 'Watched Track One',
        subtitles: [{ name: 'Artist One' }],
        time: '2021-06-15T20:00:00Z'
      },
      {
        header: 'YouTube',
        title: 'Watched Funny Video',
        subtitles: [{ name: 'Creator One' }],
        time: '2021-06-15T20:05:00Z'
      },
      {
        header: 'YouTube Music',
        title: 'Searched for something',
        time: '2021-06-15T20:10:00Z'
      }
    ];

    const filePath = path.join(tempDir, 'watch-history.json');
    fs.writeFileSync(filePath, JSON.stringify(youtubeData));

    const records = parseYouTubeMusicJson(filePath);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].title, 'Watched Track One');
  });
});

describe('YouTube Music Record Conversion', () => {
  it('should convert YouTube Music record to PlayRecord', () => {
    const youtubeRecord = {
      header: 'YouTube Music',
      title: 'Watched Test Track',
      subtitles: [{ name: 'Test Artist' }],
      time: '2021-06-15T20:00:00Z',
      titleUrl: 'https://music.youtube.com/watch?v=123'
    };

    const playRecord = convertYouTubeMusicToPlayRecord(youtubeRecord, mockConfig);

    assert.strictEqual(playRecord.trackName, 'Test Track');
    assert.strictEqual(playRecord.artists[0].artistName, 'Test Artist');
    assert.strictEqual(playRecord.playedTime, '2021-06-15T20:00:00Z');
    assert.strictEqual(playRecord.musicServiceBaseDomain, 'music.youtube.com');
    assert.strictEqual(playRecord.originUrl, 'https://music.youtube.com/watch?v=123');
  });
});
