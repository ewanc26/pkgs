/**
 * Last.fm CSV — CLI wrapper.
 * Re-exports the environment-agnostic core and adds a Node.js fs loader.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { LastFmCsvRecord, PlayRecord } from '../types.js';
import {
  parseLastFmCsvContent,
  convertToPlayRecord as coreConvert,
  fetchLastFmScrobbles,
  lastFmRecordsToCsv,
  type LastFmFetchOptions,
} from '@ewanc26/croft-click-core';
import { VERSION } from '../config.js';

export { parseLastFmCsvContent, fetchLastFmScrobbles };
export type { LastFmCsvRecord };
export type { LastFmFetchOptions, LastFmFetchProgress } from '@ewanc26/croft-click-core';

const CLI_AGENT = `malachite/v${VERSION}`;

/**
 * Read a Last.fm CSV file from disk and return normalised records.
 */
export function parseLastFmCsv(filePath: string): LastFmCsvRecord[] {
  console.log(`Reading CSV file: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parseLastFmCsvContent(content);
  console.log(`✓ Parsed ${records.length} scrobbles\n`);
  return records;
}

/**
 * Convert a normalised Last.fm CSV record to an ATProto play record.
 * The CLI agent string is injected automatically; pass `debug=true` for
 * future extension (currently has no effect).
 */
export function convertToPlayRecord(
  csv: LastFmCsvRecord,
  _configOrUnused?: unknown,
  _debug?: boolean
): PlayRecord {
  return coreConvert(csv, CLI_AGENT);
}

/**
 * Fetch a user's scrobble history directly from the Last.fm API and write it
 * to a temp CSV file, so it flows through the exact same `--input` path as an
 * uploaded export (combined mode, sync mode, etc. all just take a file path).
 * The caller is responsible for cleaning up the returned file when done.
 */
export async function fetchLastFmToTempFile(
  username: string,
  apiKey: string,
  options?: LastFmFetchOptions,
): Promise<string> {
  const records = await fetchLastFmScrobbles(username, apiKey, options);
  const csv = lastFmRecordsToCsv(records);
  const filePath = path.join(
    os.tmpdir(),
    `malachite-lastfm-${username.trim().replace(/[^a-z0-9_-]/gi, '_')}-${Date.now()}.csv`,
  );
  fs.writeFileSync(filePath, csv, 'utf-8');
  return filePath;
}
