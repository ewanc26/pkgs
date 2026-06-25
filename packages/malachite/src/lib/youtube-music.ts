/**
 * YouTube Music JSON — CLI wrapper.
 * Re-exports the environment-agnostic core and adds a Node.js fs loader.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PlayRecord } from '../types.js';
import type { YouTubeMusicRecord } from '@ewanc26/croft-click-core';
import { parseYouTubeMusicJsonContent, convertYouTubeMusicToPlayRecord as coreConvert, VERSION } from '@ewanc26/croft-click-core';

export { parseYouTubeMusicJsonContent };
export type { YouTubeMusicRecord };

const CLI_AGENT = `malachite/v${VERSION}`;

/**
 * Read YouTube Music JSON export — Node CLI wrapper
 * Supports both single files and directories with multiple JSON files
 */
export function parseYouTubeMusicJson(filePathOrDir: string): YouTubeMusicRecord[] {
  console.log(`Reading YouTube Music export: ${filePathOrDir}`);
  
  const stats = fs.statSync(filePathOrDir);
  let allRecords: YouTubeMusicRecord[] = [];
  
  if (stats.isDirectory()) {
    // Read all JSON files in the directory
    const files = fs.readdirSync(filePathOrDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(filePathOrDir, f));
    
    console.log(`Found ${files.length} JSON files in directory`);
    
    for (const file of files) {
      const fileContent = fs.readFileSync(file, 'utf-8');
      try {
        const records = JSON.parse(fileContent) as YouTubeMusicRecord[];
        allRecords = allRecords.concat(records);
        console.log(`  ${path.basename(file)}: ${records.length} records`);
      } catch (err) {
        console.warn(`  Warning: Could not parse ${path.basename(file)} as JSON.`);
      }
    }
  } else {
    // Single file
    const fileContent = fs.readFileSync(filePathOrDir, 'utf-8');
    allRecords = JSON.parse(fileContent) as YouTubeMusicRecord[];
  }
  
  const records = parseYouTubeMusicJsonContent(allRecords);
  console.log(`✓ Parsed ${records.length} track records (filtered non-music/video views)\n`);
  return records;
}

/**
 * Convert a YouTube Music record to an ATProto play record.
 */
export function convertYouTubeMusicToPlayRecord(
  record: YouTubeMusicRecord,
  _configOrUnused?: unknown,
  _debug?: boolean
): PlayRecord {
  return coreConvert(record, CLI_AGENT);
}
