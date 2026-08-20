/**
 * Apple Music CSV parsing — environment-agnostic.
 * No Node.js deps; file I/O is the caller's responsibility.
 */

import type { AppleMusicRecord, PlayRecord } from './types.js';
import { RECORD_TYPE } from './config.js';

export type { AppleMusicRecord };

/**
 * The file we need out of an Apple Media Services export. Apple ships several
 * CSVs under `Apple Music Activity/`, and only this one has per-play rows with
 * timestamps; the similarly-named `Apple Music - Play History Daily Tracks.csv`
 * is daily aggregates with an entirely different set of columns.
 */
export const APPLE_MUSIC_EXPECTED_FILE = 'Apple Music Play Activity.csv';

/** Columns `convertAppleMusicToPlayRecord` reads. Used to sanity-check the upload. */
const REQUIRED_COLUMNS = ['Content Name', 'Artist Name'] as const;

/**
 * Thrown when a CSV parses fine but clearly isn't the Play Activity export —
 * without this the import just reports "0 records" and leaves the user guessing
 * which of Apple's many CSVs they were supposed to pick.
 */
export class AppleMusicSchemaError extends Error {
  constructor(public readonly foundColumns: string[]) {
    super(
      `This CSV doesn't look like an Apple Music play history export — it's missing the ` +
        `${REQUIRED_COLUMNS.map((c) => `"${c}"`).join(' and ')} column(s). ` +
        `Upload "${APPLE_MUSIC_EXPECTED_FILE}" from Apple_Media_Services/Apple Music Activity/ ` +
        `(the large one with per-play rows), not "Apple Music - Play History Daily Tracks.csv".`
    );
    this.name = 'AppleMusicSchemaError';
  }
}

/**
 * Filter raw Apple Music records, keeping only played tracks (has title, artist, and timestamp).
 *
 * Throws `AppleMusicSchemaError` if the rows don't carry the expected columns at
 * all, which means the wrong CSV from the export was picked.
 */
export function parseAppleMusicCsvContent(records: AppleMusicRecord[]): AppleMusicRecord[] {
  // An empty file has no headers to judge, so there's nothing to diagnose.
  if (records.length > 0) {
    const columns = Object.keys(records[0] as unknown as Record<string, unknown>);
    const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
    if (missing.length > 0) {
      throw new AppleMusicSchemaError(columns);
    }
  }

  return records.filter(
    (r) => r['Content Name'] && r['Artist Name'] && (r['Event End Timestamp'] || r['Event Start Timestamp'])
  );
}

/**
 * Convert an Apple Music record to an ATProto play record.
 *
 * @param clientAgent  The `submissionClientAgent` string for this runtime.
 */
export function convertAppleMusicToPlayRecord(r: AppleMusicRecord, clientAgent: string): PlayRecord {
  const artists: PlayRecord['artists'] = [];
  if (r['Artist Name']) {
    artists.push({ artistName: r['Artist Name'] });
  }

  // Use End Timestamp, fallback to Start Timestamp
  let playedTime = r['Event End Timestamp'] || r['Event Start Timestamp'] || new Date().toISOString();
  
  // Basic ISO format cleanup if necessary (sometimes "Z" is missing or space instead of T)
  if (!playedTime.includes('T')) {
    playedTime = playedTime.replace(' ', 'T');
  }
  if (!playedTime.endsWith('Z') && !playedTime.includes('+') && !playedTime.includes('-')) {
    playedTime += 'Z';
  }
  
  // Verify it's valid
  const dt = new Date(playedTime);
  if (isNaN(dt.getTime())) {
    playedTime = new Date().toISOString();
  } else {
    playedTime = dt.toISOString();
  }

  const record: PlayRecord = {
    $type: RECORD_TYPE,
    trackName: r['Content Name'] ?? 'Unknown Track',
    artists,
    playedTime,
    submissionClientAgent: clientAgent,
    musicServiceUri: 'https://music.apple.com/',
  };

  return record;
}
