/**
 * Record merge / deduplication helpers — environment-agnostic.
 */

import type { PlayRecord } from './types.js';
import { canonicalizeTimestamp, normalizeString, playRecordKey } from './normalize.js';

// ─── internal helpers ─────────────────────────────────────────────────────────

export type Source = 'lastfm' | 'spotify' | 'apple' | 'youtube' | 'listenbrainz' | 'unknown';

export interface NormalizedRecord {
  original: PlayRecord;
  normalizedTrack: string;
  normalizedArtist: string;
  timestamp: number;
  source: Source;
}

export interface MergeStats {
  lastfmTotal: number;
  spotifyTotal: number;
  appleTotal: number;
  youtubeTotal: number;
  listenbrainzTotal: number;
  duplicatesRemoved: number;
  mergedTotal: number;
}

/**
 * Recover which source a record came from, for re-comparison during dedup.
 * Existing records fetched from a live PDS may predate the `musicServiceUri`
 * field, so a missing value is reported as 'unknown' rather than crashing the
 * dedup sweep over production data.
 */
export function sourceOf(r: PlayRecord): Source {
  // Older records carry `musicServiceUri`; newer clients write
  // `musicServiceBaseDomain` / `originUrl` instead, so consult all three.
  const service = [r.musicServiceUri, r.musicServiceBaseDomain, r.originUrl]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase();
  if (service.includes('last.fm')) return 'lastfm';
  if (service.includes('music.apple.com')) return 'apple';
  if (service.includes('music.youtube.com')) return 'youtube';
  if (service.includes('listenbrainz.org')) return 'listenbrainz';
  if (service.includes('spotify.com')) return 'spotify';
  return service ? 'spotify' : 'unknown';
}

/** Fallback to the raw lower-cased text so symbol-only names never normalise to ''. */
function normOrRaw(value: string | undefined): string {
  const raw = value ?? '';
  return normalizeString(raw) || raw.trim().toLowerCase();
}

export function toNorm(r: PlayRecord, source: Source): NormalizedRecord {
  return {
    original: r,
    normalizedTrack: normOrRaw(r.trackName),
    normalizedArtist: normOrRaw(r.artists?.[0]?.artistName),
    timestamp: new Date(canonicalizeTimestamp(r.playedTime)).getTime(),
    source,
  };
}

/**
 * Cross-source match window. Spotify and Apple Music export the play *end*
 * time while Last.fm, ListenBrainz and live scrobblers record the *start*, so
 * the same listen differs by roughly the track length (median ≈ 3 min, and
 * well past 5 min for longer tracks).
 */
export const CROSS_SOURCE_WINDOW_MS = 15 * 60_000;

/** Same track played twice by one source this close together is one event. */
export const SAME_SOURCE_EVENT_WINDOW_MS = 5_000;

export function areDuplicates(
  a: NormalizedRecord,
  b: NormalizedRecord,
  windowMs = CROSS_SOURCE_WINDOW_MS
): boolean {
  return (
    Math.abs(a.timestamp - b.timestamp) <= windowMs &&
    a.normalizedTrack === b.normalizedTrack &&
    a.normalizedArtist === b.normalizedArtist
  );
}

export function hasMbIds(n: NormalizedRecord): boolean {
  return !!(n.original.recordingMbId || n.original.releaseMbId || n.original.artists?.[0]?.artistMbId);
}

export function betterRecord(a: NormalizedRecord, b: NormalizedRecord): PlayRecord {
  // Last.fm and ListenBrainz both resolve listens against MusicBrainz, so a
  // record from either carrying real MBIDs beats one that doesn't.
  const aResolved = (a.source === 'lastfm' || a.source === 'listenbrainz') && hasMbIds(a);
  const bResolved = (b.source === 'lastfm' || b.source === 'listenbrainz') && hasMbIds(b);
  if (aResolved && !bResolved) return a.original;
  if (bResolved && !aResolved) return b.original;
  // 'unknown'/'youtube' records (no resolvable source) sink to the bottom.
  if (a.source === 'spotify') return a.original;
  if (b.source === 'spotify') return b.original;
  if (a.source === 'apple') return a.original;
  if (b.source === 'apple') return b.original;
  return a.original;
}

interface MergeEntry {
  norm: NormalizedRecord;
  sources: Set<Source>;
}

/**
 * Merge exports from all sources, collapsing the same listen reported by
 * different services. A record only merges with an entry from a *different*
 * source that hasn't already absorbed one from its source (one-to-one), within
 * `windowMs`; genuine repeats from a single source are never collapsed.
 * Prefers records resolved against MusicBrainz (Last.fm, ListenBrainz) over
 * Spotify/Apple's richer metadata, and finally YouTube.
 */
export function mergePlayRecords(
  lastfmRecords: PlayRecord[],
  spotifyRecords: PlayRecord[],
  appleRecords: PlayRecord[] = [],
  youtubeRecords: PlayRecord[] = [],
  listenbrainzRecords: PlayRecord[] = [],
  windowMs: number = CROSS_SOURCE_WINDOW_MS
): { merged: PlayRecord[]; stats: MergeStats } {
  const all = [
    ...lastfmRecords.map((r) => toNorm(r, 'lastfm')),
    ...spotifyRecords.map((r) => toNorm(r, 'spotify')),
    ...appleRecords.map((r) => toNorm(r, 'apple')),
    ...youtubeRecords.map((r) => toNorm(r, 'youtube')),
    ...listenbrainzRecords.map((r) => toNorm(r, 'listenbrainz')),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const entries: MergeEntry[] = [];
  const groups = new Map<string, MergeEntry[]>();
  let dups = 0;

  for (const rec of all) {
    const key = `${rec.normalizedTrack}|||${rec.normalizedArtist}`;
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
    }

    // Entries are in time order, so the first eligible hit scanning backwards
    // is the nearest earlier candidate.
    let match: MergeEntry | undefined;
    for (let i = group.length - 1; i >= 0; i--) {
      const e = group[i];
      if (rec.timestamp - e.norm.timestamp > windowMs) break;
      if (!e.sources.has(rec.source)) {
        match = e;
        break;
      }
    }

    if (match) {
      const winner = betterRecord(match.norm, rec);
      match.norm = winner === rec.original ? rec : match.norm;
      match.sources.add(rec.source);
      dups++;
    } else {
      const entry: MergeEntry = { norm: rec, sources: new Set([rec.source]) };
      group.push(entry);
      entries.push(entry);
    }
  }

  const unique = entries
    .map((e) => e.norm)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((n) => n.original);

  return {
    merged: unique,
    stats: {
      lastfmTotal: lastfmRecords.length,
      spotifyTotal: spotifyRecords.length,
      appleTotal: appleRecords.length,
      youtubeTotal: youtubeRecords.length,
      listenbrainzTotal: listenbrainzRecords.length,
      duplicatesRemoved: dups,
      mergedTotal: unique.length,
    },
  };
}

/**
 * Remove duplicate records within a single input set, keeping the first
 * occurrence of each (artist, track, canonical timestamp) triple.
 *
 * Matching uses the same normalised artist + track + canonicalised timestamp as
 * every other dedup path, so the same listen submitted by two different clients
 * (e.g. Last.fm via `…T14:39:14Z` and via `…T14:39:14.000Z`) collapses to one.
 * The same track within `SAME_SOURCE_EVENT_WINDOW_MS` of the previous kept copy
 * is also treated as a duplicate event (exporters that emit one play twice).
 */
export function deduplicateInputRecords(
  records: PlayRecord[]
): { unique: PlayRecord[]; duplicates: number } {
  const seen = new Map<string, PlayRecord>();
  const lastSeen = new Map<string, number>();
  let dups = 0;
  for (const r of records) {
    const key = playRecordKey(r);
    if (seen.has(key)) {
      dups++;
      continue;
    }
    // Some exporters emit the same event several times a few ms/seconds apart.
    const trackKey = `${normOrRaw(r.trackName)}|||${normOrRaw(r.artists?.[0]?.artistName)}`;
    const ts = new Date(canonicalizeTimestamp(r.playedTime)).getTime();
    const prev = lastSeen.get(trackKey);
    if (prev !== undefined && Number.isFinite(ts) && Math.abs(ts - prev) <= SAME_SOURCE_EVENT_WINDOW_MS) {
      dups++;
      continue;
    }
    if (Number.isFinite(ts)) lastSeen.set(trackKey, ts);
    seen.set(key, r);
  }
  return { unique: Array.from(seen.values()), duplicates: dups };
}

/**
 * Sort records chronologically (oldest first by default).
 */
export function sortRecords(records: PlayRecord[], reverseChronological = false): PlayRecord[] {
  return [...records].sort((a, b) => {
    const diff = new Date(a.playedTime).getTime() - new Date(b.playedTime).getTime();
    return reverseChronological ? -diff : diff;
  });
}
