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
import { normalizeMusicBrainzId } from './mbid.js';
import { extractTextEntries, isZipArchive } from './archive.js';

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
 * Whether a filename could hold ListenBrainz listens.
 *
 * The current export splits listens across `listens/<year>/<month>.jsonl` and
 * ships `user.json` and `feedback.jsonl` alongside them. Those two carry no
 * listens, so `parseListenBrainzJsonContent` would discard their contents
 * anyway — skipping them by name just avoids decompressing them.
 */
export function isListenBrainzDataFile(name: string): boolean {
  const base = name.split('/').pop()?.toLowerCase() ?? '';
  if (base.startsWith('.') || base === 'user.json' || base === 'feedback.jsonl') return false;
  return base.endsWith('.json') || base.endsWith('.jsonl');
}

/**
 * Parse several export files as one history.
 *
 * A ListenBrainz export is a directory of per-month files rather than the
 * single document the importer originally assumed, so every selected file is
 * parsed and concatenated. Ordering is the caller's; downstream dedup handles
 * any overlap between files.
 */
export function parseListenBrainzJsonContents(contents: Iterable<string>): ListenBrainzRecord[] {
  const records: ListenBrainzRecord[] = [];
  for (const content of contents) {
    records.push(...parseListenBrainzJsonContent(content));
  }
  return records;
}

/**
 * Parse a ListenBrainz export straight from a `.zip`, as downloaded.
 *
 * Handles the nested `listens/<year>/<month>.jsonl` layout, and also tolerates
 * a plain `.json`/`.jsonl` that was handed to us as raw bytes.
 */
export function parseListenBrainzArchive(bytes: Uint8Array): ListenBrainzRecord[] {
  if (!isZipArchive(bytes)) {
    return parseListenBrainzJsonContent(new TextDecoder().decode(bytes));
  }

  const entries = extractTextEntries(bytes, isListenBrainzDataFile);
  return parseListenBrainzJsonContents(entries.map((e) => e.text));
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
export function convertListenBrainzToPlayRecord(
  r: ListenBrainzRecord,
  clientAgent: string
): PlayRecord | null {
  const { track_name: trackName, artist_name: artistName, release_name: releaseName, mbid_mapping, additional_info } = r.track_metadata;

  // MusicBrainz IDs arrive as bare UUIDs, but the lexicon declares every MbId
  // field as `format: uri` (`mbid:<uuid>`). Publishing the raw UUID makes the
  // PDS reject the whole batch with `invalid format: Uri`, so normalise here
  // and drop anything that isn't a recognisable UUID.
  const mappedArtists = mbid_mapping?.artists;
  const artists: PlayRecord['artists'] | undefined =
    mappedArtists && mappedArtists.length > 0
      ? mappedArtists.map((a) => {
          const artistMbId = normalizeMusicBrainzId(a.artist_mbid);
          return {
            artistName: a.artist_credit_name,
            ...(artistMbId ? { artistMbId } : {}),
          };
        })
      : // No mapping and no bare artist name: leave `artists` off rather than
        // writing "Unknown Artist". The lexicon requires only `trackName`, and
        // a fabricated name is both untrue and invisible to MusicBrainz
        // enrichment later, since the field would look already-populated.
        artistName
        ? [{ artistName }]
        : undefined;

  const recordingMbId = normalizeMusicBrainzId(
    mbid_mapping?.recording_mbid ?? additional_info?.recording_mbid,
  );
  const releaseMbId = normalizeMusicBrainzId(
    mbid_mapping?.release_mbid ?? additional_info?.release_mbid,
  );

  // `trackName` is the one field the lexicon requires, and a listen without it
  // says nothing at all — unlike a missing artist, where the title and time are
  // still real. Drop it rather than invent "Unknown Track".
  if (!trackName) return null;

  // ListenBrainz timestamps are Unix seconds, not milliseconds.
  const record: PlayRecord = {
    $type: RECORD_TYPE,
    trackName,
    ...(artists ? { artists } : {}),
    playedTime: new Date(r.listened_at * 1000).toISOString(),
    submissionClientAgent: clientAgent,
    musicServiceUri: additional_info?.music_service
      ? `https://${additional_info.music_service.replace(/^https?:\/\//, '').replace(/\/$/, '')}/`
      : 'https://listenbrainz.org/',
    ...(releaseName ? { releaseName } : {}),
    ...(additional_info?.origin_url ? { originUri: additional_info.origin_url } : {}),
    ...(recordingMbId ? { recordingMbId } : {}),
    ...(releaseMbId ? { releaseMbId } : {}),
  };

  return record;
}
