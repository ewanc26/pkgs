/**
 * YouTube Music JSON parsing — environment-agnostic.
 * No Node.js deps; file I/O is the caller's responsibility.
 */

import type { YouTubeMusicRecord, PlayRecord } from './types.js';
import { RECORD_TYPE } from './config.js';

export type { YouTubeMusicRecord };

/**
 * Filter raw YouTube Music records, keeping only actual music tracks.
 * Google Takeout often includes video views or searches, so we filter by header.
 */
export function parseYouTubeMusicJsonContent(records: YouTubeMusicRecord[]): YouTubeMusicRecord[] {
  return records.filter(
    (r) => r.header === 'YouTube Music' && r.title && r.title.startsWith('Watched ') && r.subtitles && r.subtitles.length > 0
  );
}

/**
 * Convert a YouTube Music record to an ATProto play record.
 *
 * @param clientAgent  The `submissionClientAgent` string for this runtime.
 */
export function convertYouTubeMusicToPlayRecord(r: YouTubeMusicRecord, clientAgent: string): PlayRecord {
  const artists: PlayRecord['artists'] = [];
  
  // Extract artist from the first subtitle
  const artistName = r.subtitles && r.subtitles.length > 0 ? r.subtitles[0].name : 'Unknown Artist';
  
  // Filter out the typical Google format where subtitle is just artist URL, though Takeout puts artist names there
  if (artistName !== 'Unknown Artist' && !artistName.includes('music.youtube.com')) {
     artists.push({ artistName });
  } else {
     artists.push({ artistName: 'Unknown Artist' });
  }

  // Strip "Watched " prefix from title
  let trackName = r.title || 'Unknown Track';
  if (trackName.startsWith('Watched ')) {
    trackName = trackName.substring(8);
  }

  const record: PlayRecord = {
    $type: RECORD_TYPE,
    trackName,
    artists,
    playedTime: r.time,
    submissionClientAgent: clientAgent,
    musicServiceBaseDomain: 'music.youtube.com',
    originUrl: r.titleUrl || '',
  };

  return record;
}
