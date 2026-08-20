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
export function convertYouTubeMusicToPlayRecord(r: YouTubeMusicRecord, clientAgent: string): PlayRecord | null {
  // Takeout puts the artist in the first subtitle, but sometimes that's a bare
  // channel URL instead of a name. Either way, an unusable value means we leave
  // `artists` off rather than inventing one — a placeholder would also hide the
  // record from MusicBrainz enrichment, which looks for a missing artist.
  const subtitle = r.subtitles?.[0]?.name;
  const artistName = subtitle && !subtitle.includes('music.youtube.com') ? subtitle : undefined;
  const artists: PlayRecord['artists'] | undefined = artistName ? [{ artistName }] : undefined;

  // Strip "Watched " prefix from title
  let trackName = r.title ?? '';
  if (trackName.startsWith('Watched ')) {
    trackName = trackName.substring(8);
  }
  // `trackName` is the lexicon's only required field.
  if (!trackName) return null;

  const record: PlayRecord = {
    $type: RECORD_TYPE,
    trackName,
    ...(artists ? { artists } : {}),
    playedTime: r.time,
    submissionClientAgent: clientAgent,
    musicServiceUri: 'https://music.youtube.com/',
    ...(r.titleUrl ? { originUri: r.titleUrl } : {}),
  };

  return record;
}
