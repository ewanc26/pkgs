/**
 * ListenBrainz JSON parsing — environment-agnostic.
 * No Node.js deps; file I/O is the caller's responsibility.
 *
 * ListenBrainz doesn't have one single canonical export format: the web UI's
 * "Download Listens" feature and various community export tools have shipped
 * a plain JSON array, an object wrapping the array (`{ listens: [...] }` or
 * the API's `{ payload: { listens: [...] } }`), and newline-delimited JSON
 * (one listen per line, matching ListenBrainz's own full-dump format). We
 * accept all of these rather than guess wrong and fail silently.
 */

import type { ListenBrainzRecord, PlayRecord } from './types.js';
import { RECORD_TYPE } from './config.js';

function isListenBrainzRecord(v: unknown): v is ListenBrainzRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  if (typeof r.listened_at !== 'number') return false;
  const tm = r.track_metadata as Record<string, unknown> | undefined;
  return !!tm && typeof tm.track_name === 'string' && typeof tm.artist_name === 'string';
}

/**
 * Parse raw ListenBrainz export text into a flat list of listen records.
 * Handles a top-level array, `{ listens: [...] }`, `{ payload: { listens: [...] } }`,
 * and newline-delimited JSON. Malformed/unrecognized entries are dropped rather
 * than throwing, since large exports commonly have a few stray bad lines.
 */
export function parseListenBrainzJsonContent(raw: string): ListenBrainzRecord[] {
  const text = raw.trim();
  if (!text) return [];

  const collect = (value: unknown): ListenBrainzRecord[] => {
    if (Array.isArray(value)) {
      return value.filter(isListenBrainzRecord);
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj.listens)) return obj.listens.filter(isListenBrainzRecord);
      const payload = obj.payload as Record<string, unknown> | undefined;
      if (payload && Array.isArray(payload.listens)) return payload.listens.filter(isListenBrainzRecord);
      if (isListenBrainzRecord(value)) return [value];
    }
    return [];
  };

  try {
    const parsed = JSON.parse(text);
    const records = collect(parsed);
    if (records.length > 0) return records;
  } catch {
    // Not a single JSON document — fall through to NDJSON handling below.
  }

  // Newline-delimited JSON: one listen object per line.
  const records: ListenBrainzRecord[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const value = JSON.parse(trimmed);
      if (isListenBrainzRecord(value)) records.push(value);
    } catch {
      // Skip unparseable lines.
    }
  }
  return records;
}

/**
 * Convert a ListenBrainz record to an ATProto play record.
 *
 * `mbid_mapping` is only present once ListenBrainz has resolved the listen
 * against MusicBrainz, and `additional_info` is entirely optional per the
 * submission format — both are commonly absent, so this must not assume
 * either exists.
 *
 * @param clientAgent  The `submissionClientAgent` string for this runtime.
 */
export function convertListenBrainzToPlayRecord(r: ListenBrainzRecord, clientAgent: string): PlayRecord {
  const { track_name: trackName, artist_name: artistName, release_name: releaseName, mbid_mapping, additional_info } = r.track_metadata;

  const mappedArtists = mbid_mapping?.artists;
  const artists: PlayRecord['artists'] =
    mappedArtists && mappedArtists.length > 0
      ? mappedArtists.map((a) => ({ artistName: a.artist_credit_name, artistMbId: a.artist_mbid }))
      : [{ artistName: artistName || 'Unknown Artist' }];

  const recordingMbId = mbid_mapping?.recording_mbid ?? additional_info?.recording_mbid;
  const releaseMbId = mbid_mapping?.release_mbid ?? additional_info?.release_mbid;

  // ListenBrainz timestamps are Unix seconds, not milliseconds.
  const record: PlayRecord = {
    $type: RECORD_TYPE,
    trackName: trackName || 'Unknown Track',
    artists,
    releaseName,
    playedTime: new Date(r.listened_at * 1000).toISOString(),
    submissionClientAgent: clientAgent,
    musicServiceBaseDomain: additional_info?.music_service || 'listenbrainz.org',
    originUrl: additional_info?.origin_url || '',
    ...(recordingMbId ? { recordingMbId } : {}),
    ...(releaseMbId ? { releaseMbId } : {}),
  };

  return record;
}
