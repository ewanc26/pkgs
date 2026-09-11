/**
 * Spotify JSON parsing — environment-agnostic.
 * No Node.js deps; file I/O is the caller's responsibility.
 */

import type { SpotifyRecord, PlayRecord } from './types.js';
import { RECORD_TYPE } from './config.js';
import { canonicalizeTimestamp, normalizeName } from './normalize.js';

export type { SpotifyRecord };

/**
 * Filter raw Spotify records, keeping only music tracks (not podcasts).
 */
export function parseSpotifyJsonContent(records: SpotifyRecord[]): SpotifyRecord[] {
  return records.filter(
    (r) => r.master_metadata_track_name && r.master_metadata_album_artist_name
  );
}

/**
 * Convert a Spotify record to an ATProto play record.
 *
 * @param clientAgent  The `submissionClientAgent` string for this runtime.
 */
export function convertSpotifyToPlayRecord(r: SpotifyRecord, clientAgent: string): PlayRecord | null {
  // Podcast episodes and local files come through with no track metadata; the
  // lexicon requires `trackName`, and a play with no title says nothing.
  const trackName = r.master_metadata_track_name;
  if (!trackName) return null;

  const artistName = r.master_metadata_album_artist_name;

  const record: PlayRecord = {
    $type: RECORD_TYPE,
    trackName: normalizeName(trackName),
    // Left off when unknown rather than filled with a placeholder, so
    // MusicBrainz enrichment can still see it as a gap to fill.
    ...(artistName ? { artists: [{ artistName: normalizeName(artistName) }] } : {}),
    // Spotify timestamps arrive as ISO 8601 without milliseconds; canonicalise
    // so they collide with millisecond-bearing copies of the same instant and
    // publish byte-identical timestamps (Bug 1).
    playedTime: canonicalizeTimestamp(r.ts),
    submissionClientAgent: clientAgent,
    musicServiceUri: 'https://open.spotify.com/',
  };

  if (r.master_metadata_album_album_name) record.releaseName = normalizeName(r.master_metadata_album_album_name);
  if (r.spotify_track_uri) {
    const id = r.spotify_track_uri.replace('spotify:track:', '');
    record.originUri = `https://open.spotify.com/track/${id}`;
  }

  // NOTE: Spotify does NOT expose track length in the export — `ms_played` is
  // *how long the user listened*, not the duration of the track (a skipped play
  // would report a few seconds). Publishing it as `duration` would mislabel
  // short skips as short tracks, so we deliberately leave `duration` unset and
  // rely on optional MusicBrainz enrichment to fill it where available.
  // (See Bug 3.)

  return record;
}
