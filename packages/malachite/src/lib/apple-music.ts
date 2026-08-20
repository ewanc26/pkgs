/**
 * Apple Music CSV — CLI wrapper.
 * Re-exports the environment-agnostic core and adds a Node.js fs loader.
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import type { PlayRecord } from '../types.js';
import type { AppleMusicRecord } from '@ewanc26/croft-click-core';
import {
  parseAppleMusicCsvContent,
  convertAppleMusicToPlayRecord as coreConvert,
  parseDailyTracksArtistMap,
  APPLE_MUSIC_DAILY_TRACKS_FILE,
} from '@ewanc26/croft-click-core';
import { VERSION } from '../config.js';

export { parseAppleMusicCsvContent };
export type { AppleMusicRecord };

const CLI_AGENT = `malachite/v${VERSION}`;

/**
 * Read an Apple Music CSV file from disk and return parsed records.
 */
export function parseAppleMusicCsv(filePath: string): AppleMusicRecord[] {
  console.log(`Reading Apple Music export: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Apple Music exports might have a BOM
  const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  // Use csv-parse/sync to robustly handle quoted newlines
  const rawRecords = parse(cleanContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as AppleMusicRecord[];

  const records = parseAppleMusicCsvContent(rawRecords);
  console.log(`✓ Parsed ${records.length} valid playback records (filtered non-music/invalid records)\n`);
  return records;
}

/**
 * Convert a parsed Apple Music CSV record to an ATProto play record.
 */
export function convertAppleMusicToPlayRecord(
  record: AppleMusicRecord,
  _configOrUnused?: unknown,
  _debug?: boolean,
  artistLookup?: Map<string, string>
): PlayRecord | null {
  return coreConvert(record, CLI_AGENT, artistLookup);
}

/**
 * Convert a batch of rows, dropping any whose artist couldn't be resolved and
 * saying so — silently importing fewer plays than the file contains is exactly
 * the failure mode that made this hard to diagnose in the first place.
 */
export function convertAppleMusicRecords(
  records: AppleMusicRecord[],
  artistLookup?: Map<string, string>
): PlayRecord[] {
  const converted = records.map((r) => coreConvert(r, CLI_AGENT, artistLookup));
  const kept = converted.filter((r): r is PlayRecord => r !== null);
  const skipped = converted.length - kept.length;

  if (skipped > 0) {
    console.log(
      `⚠ Skipped ${skipped} play(s) with no artist name. Current Apple exports omit ` +
        `the artist column; pass --apple-daily-tracks "${APPLE_MUSIC_DAILY_TRACKS_FILE}" ` +
        `from the same folder to recover them.\n`
    );
  }

  return kept;
}

/**
 * Read `Apple Music - Play History Daily Tracks.csv` and build the title → artist
 * lookup that current Play Activity exports need (they no longer carry an artist).
 */
export function parseAppleMusicDailyTracksCsv(filePath: string): Map<string, string> {
  console.log(`Reading Apple Music daily tracks: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  const rows = parse(cleanContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as Array<Record<string, string>>;

  const map = parseDailyTracksArtistMap(rows);
  console.log(`✓ Recovered ${map.size} artist names\n`);
  return map;
}
