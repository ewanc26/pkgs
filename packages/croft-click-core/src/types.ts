/**
 * Shared type definitions — environment-agnostic.
 * Used by both the CLI (src/lib/) and the web (web/src/lib/core/).
 */

export interface LastFmCsvRecord {
  uts: string;
  utc_time: string;
  artist: string;
  artist_mbid?: string;
  album: string;
  album_mbid?: string;
  track: string;
  track_mbid?: string;
}

export interface PlayRecordArtist {
  artistName: string;
  artistMbId?: string;
}

export interface PlayRecord {
  $type: string;
  trackName: string;
  /**
   * Optional, matching the lexicon — `fm.teal.feed.play` requires only
   * `trackName`. Omitted rather than guessed when a source doesn't tell us who
   * the artist is (current Apple Music exports don't), since an absent field is
   * honest where a placeholder name would be fabrication.
   */
  artists?: PlayRecordArtist[];
  playedTime: string;
  submissionClientAgent: string;
  musicServiceUri: string;
  releaseName?: string;
  releaseMbId?: string;
  recordingMbId?: string;
  /** ISRC of the recording, per the lexicon. Set by MusicBrainz enrichment. */
  isrc?: string;
  originUri?: string;
}

export interface PublishResult {
  successCount: number;
  errorCount: number;
  cancelled: boolean;
}

export type ImportMode = 'lastfm' | 'spotify' | 'apple' | 'youtube' | 'listenbrainz' | 'combined' | 'sync' | 'deduplicate' | 'polish';

export interface SpotifyRecord {
  ts: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
  episode_name: string | null;
  episode_show_name: string | null;
  spotify_episode_uri: string | null;
  reason_start: string;
  reason_end: string;
  shuffle: boolean;
  skipped: boolean;
  offline: boolean;
  offline_timestamp: number | null;
  incognito_mode: boolean;
}

export interface ListenBrainzRecord {
  listened_at: number;
  track_metadata: {
    additional_info?: {
      artist_mbids?: string[];
      release_mbid?: string | null;
      recording_mbid?: string | null;
      track_mbid?: string | null;
      isrc?: string;
      music_service?: string;
      origin_url?: string;
    };
    // Only populated once ListenBrainz has matched the listen against
    // MusicBrainz — real exports carry an explicit `null` for unmatched listens
    // and omit the key entirely in older dumps.
    mbid_mapping?: {
      artist_mbids?: string[];
      release_mbid?: string | null;
      recording_mbid?: string | null;
      recording_name?: string;
      artists?: { artist_credit_name: string; artist_mbid: string; }[];
    } | null;
    artist_name: string;
    track_name: string;
    release_name?: string;
  };
}

/**
 * A row of `Apple Music Play Activity.csv`.
 *
 * Column names differ across export generations, so nearly everything is
 * optional: current exports use `Song Name` and have dropped `Artist Name`
 * entirely, while older ones use `Content Name` and do carry an artist. Read
 * these through the helpers in `apple-music.ts` rather than directly.
 */
export interface AppleMusicRecord {
  /** Track title in current exports. */
  'Song Name'?: string;
  /** Track title in pre-~2021 exports. */
  'Content Name'?: string;
  /** Absent from current exports; present in older ones. */
  'Artist Name'?: string;
  /** Artist of the browsed container — rarely set, and not always the track's. */
  'Container Artist Name'?: string;
  'Album Name'?: string;
  'Event End Timestamp'?: string;
  'Event Start Timestamp'?: string;
  'Play Duration Milliseconds'?: string;
}

export interface YouTubeMusicSubtitle {
  name: string;
  url?: string;
}

export interface YouTubeMusicRecord {
  header: string;
  title: string;
  titleUrl?: string;
  subtitles?: YouTubeMusicSubtitle[];
  time: string;
  products?: string[];
  activityControls?: string[];
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'progress' | 'section';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
}
