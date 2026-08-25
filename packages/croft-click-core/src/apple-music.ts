/**
 * Apple Music CSV parsing — environment-agnostic.
 * No Node.js deps; file I/O is the caller's responsibility.
 */

import type { AppleMusicRecord, PlayRecord } from './types.js';
import type { AppleCatalogHint } from './apple-catalog.js';
import { registerAppleCatalogHint } from './apple-catalog.js';
import { RECORD_TYPE } from './config.js';

export type { AppleMusicRecord };

/**
 * The file we need out of an Apple Media Services export. Apple ships several
 * CSVs under `Apple Music Activity/`, and only this one has per-play rows with
 * timestamps; the similarly-named `Apple Music - Play History Daily Tracks.csv`
 * is daily aggregates with an entirely different set of columns.
 */
export const APPLE_MUSIC_EXPECTED_FILE = 'Apple Music Play Activity.csv';

/** The companion file that can supply the artists Play Activity no longer carries. */
export const APPLE_MUSIC_DAILY_TRACKS_FILE = 'Apple Music - Play History Daily Tracks.csv';

/**
 * Column holding the track title, oldest name first.
 *
 * Apple renamed this between export generations: pre-~2021 exports call it
 * `Content Name`, current ones `Song Name`. Accept either so a fresh export and
 * an archived one both import.
 */
const TITLE_COLUMNS = ['Content Name', 'Song Name'] as const;

/**
 * Columns that may hold an artist, best first.
 *
 * Current exports dropped the per-row `Artist Name` entirely. `Container Artist
 * Name` survives but is the artist page the user browsed from, populated only
 * occasionally, so the Daily Tracks file and catalogue enrichment remain the
 * normal recovery paths.
 */
const ARTIST_COLUMNS = ['Artist Name', 'Container Artist Name'] as const;

/** Columns that may hold the album/release title, best first. */
const ALBUM_COLUMNS = ['Album Name', 'Container Album Name'] as const;

/**
 * Thrown when a CSV parses fine but clearly isn't the Play Activity export —
 * without this the import just reports "0 records" and leaves the user guessing
 * which of Apple's many CSVs they were supposed to pick.
 */
export class AppleMusicSchemaError extends Error {
  constructor(public readonly foundColumns: string[]) {
    const preview = foundColumns.length
      ? foundColumns.slice(0, 8).map((c) => `"${c}"`).join(', ') +
        (foundColumns.length > 8 ? `, …(${foundColumns.length} columns total)` : '')
      : '(none)';

    super(
      `This CSV has no track-title column (${TITLE_COLUMNS.map((c) => `"${c}"`).join(' or ')}), ` +
        `so it isn't an Apple Music play history export. ` +
        `Found instead: ${preview}. ` +
        `Upload "${APPLE_MUSIC_EXPECTED_FILE}" from Apple_Media_Services/Apple Music Activity/ ` +
        `— the large one with one row per play.`
    );
    this.name = 'AppleMusicSchemaError';
  }
}

/** Read a column by trying each candidate name in order. */
function firstNonEmpty(r: AppleMusicRecord, columns: readonly string[]): string | undefined {
  for (const c of columns) {
    const v = (r as unknown as Record<string, string | undefined>)[c];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

/** The track title for a row, under whichever column name this export uses. */
export function appleMusicTrackName(r: AppleMusicRecord): string | undefined {
  return firstNonEmpty(r, TITLE_COLUMNS);
}

/**
 * Normalises a title for cross-file matching: case, whitespace, and the
 * `- Single`/`- EP` suffixes Apple appends inconsistently between files.
 */
function titleKey(title: string): string {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s*-\s*(single|ep)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a title → artist lookup from `Apple Music - Play History Daily Tracks.csv`.
 *
 * The files share no stable join key, so title matching is necessarily a
 * fallback. Only titles that map to exactly one artist are accepted; an
 * ambiguous title is deliberately left for catalogue enrichment instead of
 * silently assigning the first artist encountered.
 */
export function parseDailyTracksArtistMap(rows: Array<Record<string, string>>): Map<string, string> {
  const candidates = new Map<string, Set<string>>();

  for (const row of rows) {
    const description = row['Track Description']?.trim();
    if (!description) continue;

    const sep = description.indexOf(' - ');
    if (sep <= 0) continue;

    const artist = description.slice(0, sep).trim();
    const title = description.slice(sep + 3).trim();
    if (!artist || !title) continue;

    const key = titleKey(title);
    const artists = candidates.get(key) ?? new Set<string>();
    artists.add(artist);
    candidates.set(key, artists);
  }

  const map = new Map<string, string>();
  for (const [key, artists] of candidates) {
    if (artists.size === 1) map.set(key, artists.values().next().value!);
  }
  return map;
}

/**
 * Build source-only hints used to validate an Apple catalogue search result.
 * These hints never become part of the published ATProto record.
 */
export function appleCatalogHintFromAppleMusicRecord(r: AppleMusicRecord): AppleCatalogHint {
  const rawDuration = r['Media Duration In Milliseconds'] || r['Play Duration Milliseconds'];
  const duration = rawDuration ? Number(rawDuration) : NaN;
  const country = r['ISO Country']?.trim().toUpperCase();

  return {
    ...(Number.isFinite(duration) && duration > 0 ? { durationMs: duration } : {}),
    ...(country && /^[A-Z]{2}$/.test(country) ? { country } : {}),
  };
}

/** Current exports contain zero-duration radio/metadata rows alongside tracks. */
function isNonTrackMetadataRow(r: AppleMusicRecord): boolean {
  const itemType = r['Item Type']?.trim();
  const duration = Number(r['Media Duration In Milliseconds']);
  return Boolean(itemType && itemType !== 'ITUNES_STORE_CONTENT' && Number.isFinite(duration) && duration === 0);
}

/**
 * Filter raw Apple Music records, keeping only actual played tracks.
 *
 * Artist is deliberately not required here — current exports don't carry one,
 * and it is recovered later. Zero-duration radio/metadata events are excluded;
 * otherwise they can masquerade as song rows simply because Apple populated
 * `Song Name` on the event.
 */
export function parseAppleMusicCsvContent(records: AppleMusicRecord[]): AppleMusicRecord[] {
  if (records.length > 0) {
    const columns = Object.keys(records[0] as unknown as Record<string, unknown>);
    const normalised = new Set(columns.map((c) => c.replace(/^﻿/, '').trim()));
    if (!TITLE_COLUMNS.some((c) => normalised.has(c))) {
      throw new AppleMusicSchemaError(columns);
    }
  }

  return records.filter(
    (r) =>
      appleMusicTrackName(r) &&
      (r['Event End Timestamp'] || r['Event Start Timestamp']) &&
      !isNonTrackMetadataRow(r)
  );
}

/**
 * Convert an Apple Music record to an ATProto play record.
 *
 * @param clientAgent  The `submissionClientAgent` string for this runtime.
 */
export function convertAppleMusicToPlayRecord(
  r: AppleMusicRecord,
  clientAgent: string,
  artistLookup?: Map<string, string>
): PlayRecord | null {
  const trackName = appleMusicTrackName(r);
  if (!trackName) return null;

  const artistName = firstNonEmpty(r, ARTIST_COLUMNS) ?? artistLookup?.get(titleKey(trackName));
  const artists: PlayRecord['artists'] | undefined = artistName ? [{ artistName }] : undefined;
  const releaseName = firstNonEmpty(r, ALBUM_COLUMNS);

  let playedTime = r['Event End Timestamp'] || r['Event Start Timestamp'] || new Date().toISOString();

  if (!playedTime.includes('T')) {
    playedTime = playedTime.replace(' ', 'T');
  }
  if (!playedTime.endsWith('Z') && !playedTime.includes('+') && !playedTime.includes('-')) {
    playedTime += 'Z';
  }

  const dt = new Date(playedTime);
  if (isNaN(dt.getTime())) {
    playedTime = new Date().toISOString();
  } else {
    playedTime = dt.toISOString();
  }

  const record: PlayRecord = {
    $type: RECORD_TYPE,
    trackName,
    playedTime,
    submissionClientAgent: clientAgent,
    musicServiceUri: 'https://music.apple.com/',
  };

  if (artists) record.artists = artists;
  if (releaseName) record.releaseName = releaseName;

  registerAppleCatalogHint(record, appleCatalogHintFromAppleMusicRecord(r));
  return record;
}
