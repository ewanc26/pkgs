/**
 * ListenBrainz JSON — CLI wrapper.
 * Re-exports the environment-agnostic core and adds a Node.js fs loader.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PlayRecord } from '../types.js';
import type { ListenBrainzRecord } from '@ewanc26/croft-click-core';
import {
  parseListenBrainzJsonContent,
  parseListenBrainzJsonContents,
  parseListenBrainzArchive,
  isListenBrainzDataFile,
  convertListenBrainzToPlayRecord as coreConvert,
} from '@ewanc26/croft-click-core';
import { VERSION } from '../config.js';

export { parseListenBrainzJsonContent };
export type { ListenBrainzRecord };

const CLI_AGENT = `malachite/v${VERSION}`;

/** Recursively collect every file under `dir` that could hold listens. */
function collectDataFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectDataFiles(full));
    } else if (entry.isFile() && isListenBrainzDataFile(entry.name)) {
      found.push(full);
    }
  }
  // Chronological rather than filesystem order, so progress output reads well.
  return found.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/**
 * Read a ListenBrainz export from disk and return parsed listens.
 *
 * A current export is a `.zip` containing `listens/<year>/<month>.jsonl`, so
 * the path may be any of:
 *   - the downloaded `.zip`
 *   - the unpacked export directory (walked recursively)
 *   - a single `.json`/`.jsonl` file
 *
 * File contents may be a plain array, `{ listens: [...] }`,
 * `{ payload: { listens: [...] } }`, or newline-delimited JSON — see
 * parseListenBrainzJsonContent for details.
 */
export function parseListenBrainzJson(inputPath: string): ListenBrainzRecord[] {
  console.log(`Reading ListenBrainz export: ${inputPath}`);

  let records: ListenBrainzRecord[];

  if (fs.statSync(inputPath).isDirectory()) {
    const files = collectDataFiles(inputPath);
    if (files.length === 0) {
      throw new Error(`No .json or .jsonl files found under ${inputPath}`);
    }
    console.log(`  Found ${files.length} export file(s)`);
    records = parseListenBrainzJsonContents(files.map((f) => fs.readFileSync(f, 'utf-8')));
  } else if (inputPath.toLowerCase().endsWith('.zip')) {
    records = parseListenBrainzArchive(new Uint8Array(fs.readFileSync(inputPath)));
  } else {
    records = parseListenBrainzJsonContent(fs.readFileSync(inputPath, 'utf-8'));
  }

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
