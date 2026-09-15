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
  const service = r.musicServiceUri?.toLowerCase() ?? '';
  if (service.includes('last.fm')) return 'lastfm';
  if (service.includes('music.apple.com')) return 'apple';
  if (service.includes('music.youtube.com')) return 'youtube';
  if (service.includes('listenbrainz.org')) return 'listenbrainz';
  return service ? 'spotify' : 'unknown';
}

export function toNorm(r: PlayRecord, source: Source): NormalizedRecord {
  return {
    original: r,
    normalizedTrack: normalizeString(r.trackName),
    normalizedArtist: normalizeString(r.artists?.[0]?.artistName ?? ''),
    timestamp: new Date(canonicalizeTimestamp(r.playedTime)).getTime(),
    source,
  };
}

export function areDuplicates(a: NormalizedRecord, b: NormalizedRecord): boolean {
  return (
    Math.abs(a.timestamp - b.timestamp) <= 300_000 &&
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

/**
 * Merge exports from all sources, deduplicating records within ±5 minutes
 * of each other. Prefers records resolved against MusicBrainz (Last.fm,
 * ListenBrainz) over Spotify/Apple's richer metadata, and finally YouTube.
 */
export function mergePlayRecords(
  lastfmRecords: PlayRecord[],
  spotifyRecords: PlayRecord[],
  appleRecords: PlayRecord[] = [],
  youtubeRecords: PlayRecord[] = [],
  listenbrainzRecords: PlayRecord[] = []
): { merged: PlayRecord[]; stats: MergeStats } {
  const all = [
    ...lastfmRecords.map((r) => toNorm(r, 'lastfm')),
    ...spotifyRecords.map((r) => toNorm(r, 'spotify')),
    ...appleRecords.map((r) => toNorm(r, 'apple')),
    ...youtubeRecords.map((r) => toNorm(r, 'youtube')),
    ...listenbrainzRecords.map((r) => toNorm(r, 'listenbrainz')),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const unique: PlayRecord[] = [];
  const seen = new Set<string>();
  let dups = 0;

  for (const rec of all) {
    const key = `${rec.normalizedTrack}|${rec.normalizedArtist}|${Math.floor(rec.timestamp / 60_000)}`;
    if (seen.has(key)) {
      const idx = unique.findIndex((u) => areDuplicates(rec, toNorm(u, sourceOf(u))));
      if (idx !== -1) {
        const existing = toNorm(unique[idx], sourceOf(unique[idx]));
        unique[idx] = betterRecord(existing, rec);
        dups++;
        continue;
      }
    }
    seen.add(key);
    unique.push(rec.original);
  }

  unique.sort((a, b) => new Date(a.playedTime).getTime() - new Date(b.playedTime).getTime());

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
 */
export function deduplicateInputRecords(
  records: PlayRecord[]
): { unique: PlayRecord[]; duplicates: number } {
  const seen = new Map<string, PlayRecord>();
  let dups = 0;
  for (const r of records) {
    const key = playRecordKey(r);
    if (!seen.has(key)) seen.set(key, r);
    else dups++;
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
