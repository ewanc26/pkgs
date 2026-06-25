/**
 * Apple Music CSV — CLI wrapper.
 * Re-exports the environment-agnostic core and adds a Node.js fs loader.
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import type { PlayRecord } from '../types.js';
import type { AppleMusicRecord } from '@ewanc26/croft-click-core';
import { parseAppleMusicCsvContent, convertAppleMusicToPlayRecord as coreConvert, VERSION } from '@ewanc26/croft-click-core';

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
  _debug?: boolean
): PlayRecord {
  return coreConvert(record, CLI_AGENT);
}
