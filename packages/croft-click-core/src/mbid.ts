/**
 * MusicBrainz identifier normalisation — environment-agnostic.
 *
 * The teal lexicons (fm.teal.feed.play, fm.teal.feed.defs#artist) declare every
 * MusicBrainz field as `format: uri` and document the expected shape as
 * `mbid:<uuid>`. Sources hand us bare UUIDs (ListenBrainz) or full
 * musicbrainz.org URLs (some CSV exporters), both of which the PDS rejects with
 * `invalid format: Uri`, so everything is funnelled through here first.
 */

import type { PlayRecord } from './types.js';

const MBID_URI_RE = /^mbid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Coerce a MusicBrainz identifier into the `mbid:<uuid>` URI the lexicon wants.
 * Returns undefined when the input holds no recognisable UUID, so callers can
 * simply omit the field rather than publish something the PDS will reject.
 */
export function normalizeMusicBrainzId(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (MBID_URI_RE.test(trimmed)) return `mbid:${trimmed.slice(5).toLowerCase()}`;

  const withoutUrl = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  if (withoutUrl && UUID_RE.test(withoutUrl)) return `mbid:${withoutUrl.toLowerCase()}`;

  return undefined;
}

/**
 * Normalise every MusicBrainz identifier immediately before publication.
 *
 * Conversion normally does this earlier, but records can reach the shared
 * publisher through several browser and CLI paths. Keeping this guard in the
 * shared publishing boundary prevents one bare or malformed identifier from
 * causing the PDS to reject an entire applyWrites batch.
 */
export function sanitizePlayRecordMusicBrainzIds(record: PlayRecord): PlayRecord {
  const sanitized: PlayRecord = { ...record };

  const recordingMbId = normalizeMusicBrainzId(record.recordingMbId);
  if (recordingMbId) sanitized.recordingMbId = recordingMbId;
  else delete sanitized.recordingMbId;

  const releaseMbId = normalizeMusicBrainzId(record.releaseMbId);
  if (releaseMbId) sanitized.releaseMbId = releaseMbId;
  else delete sanitized.releaseMbId;

  if (record.artists) {
    sanitized.artists = record.artists.map((artist) => {
      const sanitizedArtist = { ...artist };
      const artistMbId = normalizeMusicBrainzId(artist.artistMbId);
      if (artistMbId) sanitizedArtist.artistMbId = artistMbId;
      else delete sanitizedArtist.artistMbId;
      return sanitizedArtist;
    });
  }

  return sanitized;
}
