/**
 * Apple Music CSV — CLI wrapper.
 * Re-exports the environment-agnostic core and adds a Node.js fs loader.
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import type { PlayRecord } from '../types.js';
import type { AppleMusicRecord, AppleCatalogHint } from '@ewanc26/croft-click-core';
import {
  parseAppleMusicCsvContent,
  convertAppleMusicToPlayRecord as coreConvert,
  parseDailyTracksArtistMap,
  APPLE_MUSIC_DAILY_TRACKS_FILE,
  appleCatalogHintFromAppleMusicRecord,
  appleCatalogHintKey,
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

/**
 * Convert Apple rows while retaining source-only catalogue hints in a sidecar
 * map. The hints are keyed by track + exact play timestamp, survive local/PDS
 * filtering, and never become properties of the published ATProto record.
 */
export function convertAppleMusicRecordsWithHints(
  records: AppleMusicRecord[],
  artistLookup?: Map<string, string>
): { records: PlayRecord[]; hints: Map<string, AppleCatalogHint> } {
  const converted: PlayRecord[] = [];
  const hints = new Map<string, AppleCatalogHint>();

  for (const source of records) {
    const record = coreConvert(source, CLI_AGENT, artistLookup);
    if (!record) continue;
    converted.push(record);
    hints.set(appleCatalogHintKey(record), appleCatalogHintFromAppleMusicRecord(source));
  }

  const withoutArtist = converted.filter((r) => !r.artists?.length).length;
  if (withoutArtist > 0) {
    console.log(
      `⚠ ${withoutArtist} of ${converted.length} play(s) still need an artist. ` +
        `Pass --enrich to resolve them against Apple's catalogue and MusicBrainz before publishing.\n`
    );
  }

  return { records: converted, hints };
}

/** Backwards-compatible convenience wrapper. */
export function convertAppleMusicRecords(
  records: AppleMusicRecord[],
  artistLookup?: Map<string, string>
): PlayRecord[] {
  return convertAppleMusicRecordsWithHints(records, artistLookup).records;
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
