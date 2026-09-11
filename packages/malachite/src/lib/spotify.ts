import * as fs from 'fs';
import * as path from 'path';
import type { PlayRecord, Config } from '../types.js';
import { convertSpotifyToPlayRecord as coreConvertSpotify } from '@ewanc26/croft-click-core';
import type { SpotifyRecord } from '@ewanc26/croft-click-core';
import { buildClientAgent } from '../config.js';

export type { SpotifyRecord };

// ─── web: boolean toggle ────────────────────────────────────────────────────
//  parseSpotifyJsonContent accepts an already-decoded SpotifyRecord[] so the
//  web app can call it after reading files via FileReader.
//  parseSpotifyJson remains as the Node CLI wrapper.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Filter and validate an array of already-parsed Spotify records.
 * Browser-safe — no fs dependency.
 */
export function parseSpotifyJsonContent(records: SpotifyRecord[]): SpotifyRecord[] {
  const trackRecords = records.filter(r =>
    r.master_metadata_track_name &&
    r.master_metadata_album_artist_name
  );
  console.log(`✓ Parsed ${trackRecords.length} track records (filtered ${records.length - trackRecords.length} non-music records)\n`);
  return trackRecords;
}

/**
 * Parse Spotify JSON export — Node CLI wrapper
 * Supports both single files and directories with multiple JSON files
 */
export function parseSpotifyJson(filePathOrDir: string): SpotifyRecord[] {
  console.log(`Reading Spotify export: ${filePathOrDir}`);
  
  const stats = fs.statSync(filePathOrDir);
  let allRecords: SpotifyRecord[] = [];
  
  if (stats.isDirectory()) {
    // Read all JSON files in the directory
    const files = fs.readdirSync(filePathOrDir)
      .filter(f => f.endsWith('.json') && f.startsWith('Streaming_History_Audio'))
      .map(f => path.join(filePathOrDir, f));
    
    console.log(`Found ${files.length} Spotify JSON files in directory`);
    
    for (const file of files) {
      const fileContent = fs.readFileSync(file, 'utf-8');
      const records = JSON.parse(fileContent) as SpotifyRecord[];
      allRecords = allRecords.concat(records);
      console.log(`  ${path.basename(file)}: ${records.length} records`);
    }
  } else {
    // Single file
    const fileContent = fs.readFileSync(filePathOrDir, 'utf-8');
    allRecords = JSON.parse(fileContent) as SpotifyRecord[];
  }
  
  // Delegate to the shared browser-safe content parser.
  return parseSpotifyJsonContent(allRecords);
}

/**
 * Convert a Spotify record to an ATProto play record.
 *
 * Delegates to the shared converter in `@ewanc26/croft-click-core` so the CLI
 * and the web front-end can never drift apart. The shared converter
 * canonicalises `playedTime`, applies NFKC to artist/track names, and — because
 * Spotify only exposes `ms_played` (how long the listener heard the track, not
 * the track's length) — deliberately leaves `duration` unset. `debug` is kept
 * for signature stability; the agent string is derived from the package version.
 */
export function convertSpotifyToPlayRecord(
  spotifyRecord: SpotifyRecord,
  _config?: Config,
  debug = false
): PlayRecord | null {
  return coreConvertSpotify(spotifyRecord, buildClientAgent(debug));
}
