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
} from '@ewanc26/croft-click-core';
import { VERSION } from '../config.js';

export { parseAppleMusicCsvContent };
export type { AppleMusicRecord };

const CLI_AGENT = `malachite/v${VERSION}`;

/** Read an Apple Music CSV file from disk and return parsed track rows. */
export function parseAppleMusicCsv(filePath: string): AppleMusicRecord[] {
  console.log(`Reading Apple Music export: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  const rawRecords = parse(cleanContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as AppleMusicRecord[];

  const records = parseAppleMusicCsvContent(rawRecords);
  console.log(`✓ Parsed ${records.length} valid playback records (filtered non-track/invalid records)\n`);
  return records;
}

/** Convert a parsed Apple Music CSV record to an ATProto play record. */
export function convertAppleMusicToPlayRecord(
  record: AppleMusicRecord,
  _configOrUnused?: unknown,
  _debug?: boolean,
  artistLookup?: Map<string, string>
): PlayRecord | null {
  return coreConvert(record, CLI_AGENT, artistLookup);
}

/** Convert all Apple rows; source-only catalogue hints are registered in core. */
export function convertAppleMusicRecords(
  records: AppleMusicRecord[],
  artistLookup?: Map<string, string>
): PlayRecord[] {
  const converted = records
    .map((record) => coreConvert(record, CLI_AGENT, artistLookup))
    .filter((record): record is PlayRecord => record !== null);

  const withoutArtist = converted.filter((record) => !record.artists?.length).length;
  if (withoutArtist > 0) {
    console.log(
      `⚠ ${withoutArtist} of ${converted.length} play(s) still need an artist. ` +
        `Pass --enrich to resolve them against Apple's catalogue and MusicBrainz before publishing.\n`
    );
  }

  return converted;
}

/**
 * Read `Apple Music - Play History Daily Tracks.csv` and build the title → artist
 * lookup that current Play Activity exports need.
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
  console.log(`✓ Recovered ${map.size} unambiguous artist names\n`);
  return map;
}
