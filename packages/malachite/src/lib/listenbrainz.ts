/**
 * ListenBrainz JSON — CLI wrapper.
 * Re-exports the environment-agnostic core and adds a Node.js fs loader.
 */

import * as fs from 'fs';
import type { PlayRecord } from '../types.js';
import type { ListenBrainzRecord } from '@ewanc26/croft-click-core';
import { parseListenBrainzJsonContent, convertListenBrainzToPlayRecord as coreConvert } from '@ewanc26/croft-click-core';
import { VERSION } from '../config.js';

export { parseListenBrainzJsonContent };
export type { ListenBrainzRecord };

const CLI_AGENT = `malachite/v${VERSION}`;

/**
 * Read a ListenBrainz JSON export file from disk and return parsed listens.
 * Accepts a plain array, `{ listens: [...] }`, `{ payload: { listens: [...] } }`,
 * or newline-delimited JSON — see parseListenBrainzJsonContent for details.
 */
export function parseListenBrainzJson(filePath: string): ListenBrainzRecord[] {
  console.log(`Reading ListenBrainz export: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parseListenBrainzJsonContent(content);
  console.log(`✓ Parsed ${records.length} valid listen record(s)\n`);
  return records;
}

/**
 * Convert a parsed ListenBrainz record to an ATProto play record.
 */
export function convertListenBrainzToPlayRecord(
  record: ListenBrainzRecord,
  _configOrUnused?: unknown,
  _debug?: boolean
): PlayRecord {
  return coreConvert(record, CLI_AGENT);
}
