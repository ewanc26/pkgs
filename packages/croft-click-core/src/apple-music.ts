/**
 * Apple Music CSV parsing — environment-agnostic.
 * No Node.js deps; file I/O is the caller's responsibility.
 */

import type { AppleMusicRecord, PlayRecord } from './types.js';
import { RECORD_TYPE } from './config.js';

export type { AppleMusicRecord };

/**
 * Filter raw Apple Music records, keeping only played tracks (has title, artist, and timestamp).
 */
export function parseAppleMusicCsvContent(records: AppleMusicRecord[]): AppleMusicRecord[] {
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
    musicServiceBaseDomain: 'music.apple.com',
    originUrl: '',
  };

  return record;
}
