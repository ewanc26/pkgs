/**
 * Shared normalisation for play records — environment-agnostic.
 *
 * Two concerns live here so the CLI and web front-end can never drift apart:
 *
 * 1. Timestamp canonicalisation. Different submission clients serialise the same
 *    instant in different string forms — `11:39:14Z` vs `11:39:14.000Z` vs
 *    `11:39:14+00:00` — which defeated record-key equality and produced thousands
 *    of duplicate scrobbles (see Bug 1). `canonicalizeTimestamp` parses every
 *    accepted shape and re-emits a single byte-identical ISO 8601 form, so the
 *    same listen always hashes to the same dedup key and, once published, the
 *    `playedTime` field is uniform across every client.
 *
 * 2. String comparison for matching artist / track names.
 *    `normalizeString` is case-insensitive, punctuation-insensitive, and applies
 *    Unicode NFKC equivalence first, so `Dagames`/`DAGames`,
 *    `jack stauber's`/`jack stauber's` (curly vs straight apostrophe) and
 *    `Bru-C`/`Bru-C` (non-breaking vs regular hyphen) collapse onto one value for
 *    the purposes of grouping, without rewriting the casing of the stored record
 *    (which would require an external authority and can be wrong — see Bug 4).
 */

import type { PlayRecord } from './types.js';

/**
 * Canonical ISO 8601 representation of a play timestamp.
 *
 * Parses any shape accepted by `new Date(...)` — bare ISO 8601, epoch millis,
 * `+00:00` offsets, etc. — and emits `toISOString()` (`YYYY-MM-DDTHH:mm:ss.000Z`).
 * `toISOString()` is the canonical form because three of the five source
 * converters already emit it; normalising the remaining two (Spotify and YouTube
 * pass timestamps through verbatim) to it yields byte-identical timestamps with
 * the least churn. If the input is not a parseable date it is returned trimmed
 * rather than throwing, so key construction degrades gracefully for malformed
 * data instead of aborting an entire import.
 */
export function canonicalizeTimestamp(playedTime: string): string {
  const parsed = new Date(playedTime);
  if (Number.isNaN(parsed.getTime())) return playedTime.trim();
  return parsed.toISOString();
}

/**
 * Normalise a display string for case-/punctuation-/Unicode-insensitive
 * comparison, used by every dedup and sync-matching key.
 *
 * NFKC first (so compatibility forms — fullwidth letters, ligatures, curly
 * punctuation, non-breaking hyphens — fold to their canonical equivalents), then
 * lower-case, then strip everything that is not a letter, digit, or whitespace,
 * then collapse runs of whitespace. Two names that compare equal here are
 * treated as the same artist or track for dedup purposes.
 */
export function normalizeString(value: string): string {
  return (
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** The normalised "first artist" of a record, or '' when none is present. */
export function normalizedFirstArtist(record: PlayRecord): string {
  return normalizeString(record.artists?.[0]?.artistName ?? '');
}

/** The normalised track title of a record. */
export function normalizedTrack(record: PlayRecord): string {
  return normalizeString(record.trackName);
}

/**
 * The single dedup key shared by every matching path — local input dedup,
 * remote sync filtering, and the historical CAR-cache. Composed of the
 * normalised artist, normalised track, and a canonical timestamp so that none
 * of the three known duplicate causes (timestamp format variance, casing /
 * Unicode spelling differences, missing artists) can defeat equality.
 */
export function playRecordKey(record: PlayRecord): string {
  return `${normalizedFirstArtist(record)}|||${normalizedTrack(record)}|||${canonicalizeTimestamp(record.playedTime)}`;
}

/**
 * A looser key: normalised artist + normalised track + the playedTime rounded
 * down to the minute. Used to bucket existing records so the sync filter can
 * scan neighbouring minute buckets for the ±60-second window match (Bug 2) while
 * still treating different tracks / spelling variants independently.
 */
export function trackTimeKey(record: PlayRecord): string {
  return `${normalizedTrack(record)}|||${canonicalizeTimestamp(record.playedTime)}`;
}

/** Milliseconds since the epoch for a record's canonical timestamp. */
export function epochMillis(record: PlayRecord): number {
  return new Date(canonicalizeTimestamp(record.playedTime)).getTime();
}

/**
 * Unicode NFKC normalisation for display names — applied at ingest so the
 * stored record carries the canonical spelling rather than a compatibility
 * form. Folds curly apostrophes → straight, non-breaking hyphens → regular
 * hyphens, fullwidth letters → ASCII, ligatures → their components, etc.,
 * while preserving case (we deliberately do not rewrite casing — that needs an
 * external authority and can be wrong; see Bug 4).
 */
export function normalizeName(name: string): string {
  return name.normalize('NFKC');
}
