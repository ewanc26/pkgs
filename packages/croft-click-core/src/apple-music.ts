/**
 * Apple Music CSV parsing — environment-agnostic.
 * No Node.js deps; file I/O is the caller's responsibility.
 */

import type { AppleMusicRecord, PlayRecord } from './types.js';
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
 * Current exports (143 columns, verified against a Jan 2026 export) dropped the
 * per-row `Artist Name` entirely. `Container Artist Name` survives but is the
 * artist *page you browsed from*, populated on a fraction of a percent of rows
 * and not necessarily the track's credit — so it's a last resort, not a
 * substitute. See `APPLE_MUSIC_DAILY_TRACKS_FILE` for the real recovery path.
 */
const ARTIST_COLUMNS = ['Artist Name', 'Container Artist Name'] as const;

/**
 * Thrown when a CSV parses fine but clearly isn't the Play Activity export —
 * without this the import just reports "0 records" and leaves the user guessing
 * which of Apple's many CSVs they were supposed to pick.
 */
export class AppleMusicSchemaError extends Error {
  constructor(public readonly foundColumns: string[]) {
    // Show what we did find, not just what's absent — if the columns look like
    // one long run-together string it's a delimiter problem rather than the
    // wrong file, and that's impossible to tell from "missing X" alone.
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
 * `- Single`/`- EP` suffixes Apple appends inconsistently between the two files.
 */
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*-\s*(single|ep)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a title → artist lookup from `Apple Music - Play History Daily Tracks.csv`.
 *
 * That file has no per-play timestamps (so it can't drive the import on its own)
 * but it does carry `Track Description` as `Artist - Title`, which is the only
 * artist information in the whole export once Apple dropped `Artist Name`. The
 * two files share no join key, so this matches on normalised title — good enough
 * in practice, and a wrong artist is no worse than the `Unknown` it replaces.
 */
export function parseDailyTracksArtistMap(rows: Array<Record<string, string>>): Map<string, string> {
  const map = new Map<string, string>();

  for (const row of rows) {
    const description = row['Track Description']?.trim();
    if (!description) continue;

    // `Artist - Title`. Split on the first separator: artists contain " - "
    // far less often than titles do (remixes, live versions, subtitles).
    const sep = description.indexOf(' - ');
    if (sep <= 0) continue;

    const artist = description.slice(0, sep).trim();
    const title = description.slice(sep + 3).trim();
    if (!artist || !title) continue;

    // First writer wins; later duplicates are the same song played again.
    const key = titleKey(title);
    if (!map.has(key)) map.set(key, artist);
  }

  return map;
}

/**
 * Filter raw Apple Music records, keeping only played tracks (has title, artist, and timestamp).
 *
 * Throws `AppleMusicSchemaError` if the rows don't carry the expected columns at
 * all, which means the wrong CSV from the export was picked.
 */
export function parseAppleMusicCsvContent(records: AppleMusicRecord[]): AppleMusicRecord[] {
  // An empty file has no headers to judge, so there's nothing to diagnose.
  if (records.length > 0) {
    // Tolerate stray whitespace/BOM around header cells — Apple's exports have
    // shipped both with and without a BOM, and a header that only differs by
    // trim shouldn't read as "wrong file".
    const columns = Object.keys(records[0] as unknown as Record<string, unknown>);
    const normalised = new Set(columns.map((c) => c.replace(/^﻿/, '').trim()));
    if (!TITLE_COLUMNS.some((c) => normalised.has(c))) {
      throw new AppleMusicSchemaError(columns);
    }
  }

  // Artist is deliberately *not* required here — current exports don't carry one,
  // and it's recovered later from the Daily Tracks file. A row still needs a
  // title and a timestamp to be a play at all.
  return records.filter(
    (r) => appleMusicTrackName(r) && (r['Event End Timestamp'] || r['Event Start Timestamp'])
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

  // In-row artist first, then the Daily Tracks lookup. If neither has one we
  // skip the row rather than writing "Unknown Artist" — these records land in
  // someone's public repo permanently, and a play with no artist is closer to
  // noise than data.
  const artistName = firstNonEmpty(r, ARTIST_COLUMNS) ?? artistLookup?.get(titleKey(trackName));
  if (!artistName) return null;

  const artists: PlayRecord['artists'] = [{ artistName }];

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
    trackName,
    artists,
    playedTime,
    submissionClientAgent: clientAgent,
    musicServiceUri: 'https://music.apple.com/',
  };

  return record;
}
