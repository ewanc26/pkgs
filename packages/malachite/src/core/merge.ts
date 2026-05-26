/**
 * Record merge / deduplication helpers — environment-agnostic.
 */

import type { PlayRecord } from './types.js';

// ─── internal helpers ─────────────────────────────────────────────────────────

function normalizeString(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

interface NormalizedRecord {
  original: PlayRecord;
  normalizedTrack: string;
  normalizedArtist: string;
  timestamp: number;
  source: 'lastfm' | 'spotify' | 'apple' | 'youtube';
}

function toNorm(r: PlayRecord, source: 'lastfm' | 'spotify' | 'apple' | 'youtube'): NormalizedRecord {
  return {
    original: r,
    normalizedTrack: normalizeString(r.trackName),
    normalizedArtist: normalizeString(r.artists[0]?.artistName ?? ''),
    timestamp: new Date(r.playedTime).getTime(),
    source,
  };
}

function areDuplicates(a: NormalizedRecord, b: NormalizedRecord): boolean {
  return (
    Math.abs(a.timestamp - b.timestamp) <= 300_000 &&
    a.normalizedTrack === b.normalizedTrack &&
    a.normalizedArtist === b.normalizedArtist
  );
}

function betterRecord(a: NormalizedRecord, b: NormalizedRecord): PlayRecord {
  const hasMb = (n: NormalizedRecord) =>
    n.source === 'lastfm' &&
    (n.original.recordingMbId || n.original.releaseMbId || n.original.artists[0]?.artistMbId);
  if (hasMb(a) && !hasMb(b)) return a.original;
  if (hasMb(b) && !hasMb(a)) return b.original;
  if (a.source === 'spotify') return a.original;
  if (b.source === 'spotify') return b.original;
  if (a.source === 'apple') return a.original;
  if (b.source === 'apple') return b.original;
  return a.original;
}

// ─── public API ───────────────────────────────────────────────────────────────

export interface MergeStats {
  lastfmTotal: number;
  spotifyTotal: number;
  appleTotal: number;
  youtubeTotal: number;
  duplicatesRemoved: number;
  mergedTotal: number;
}

/**
 * Merge exports from all sources, deduplicating records within ±5 minutes
 * of each other. Prefers Last.fm records that carry MusicBrainz IDs, otherwise
 * prefers Spotify/Apple for its richer metadata, and finally YouTube.
 */
export function mergePlayRecords(
  lastfmRecords: PlayRecord[],
  spotifyRecords: PlayRecord[],
  appleRecords: PlayRecord[] = [],
  youtubeRecords: PlayRecord[] = []
): { merged: PlayRecord[]; stats: MergeStats } {
  const all = [
    ...lastfmRecords.map((r) => toNorm(r, 'lastfm')),
    ...spotifyRecords.map((r) => toNorm(r, 'spotify')),
    ...appleRecords.map((r) => toNorm(r, 'apple')),
    ...youtubeRecords.map((r) => toNorm(r, 'youtube')),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const unique: PlayRecord[] = [];
  const seen = new Set<string>();
  let dups = 0;

  for (const rec of all) {
    const key = `${rec.normalizedTrack}|${rec.normalizedArtist}|${Math.floor(rec.timestamp / 60_000)}`;
    if (seen.has(key)) {
      const idx = unique.findIndex((u) => {
        let uSrc: 'lastfm' | 'spotify' | 'apple' | 'youtube' = 'spotify';
        if (u.musicServiceBaseDomain === 'last.fm') uSrc = 'lastfm';
        else if (u.musicServiceBaseDomain === 'music.apple.com') uSrc = 'apple';
        else if (u.musicServiceBaseDomain === 'music.youtube.com') uSrc = 'youtube';
        const n = toNorm(u, uSrc);
        return areDuplicates(rec, n);
      });
      if (idx !== -1) {
        let eSrc: 'lastfm' | 'spotify' | 'apple' | 'youtube' = 'spotify';
        if (unique[idx].musicServiceBaseDomain === 'last.fm') eSrc = 'lastfm';
        else if (unique[idx].musicServiceBaseDomain === 'music.apple.com') eSrc = 'apple';
        else if (unique[idx].musicServiceBaseDomain === 'music.youtube.com') eSrc = 'youtube';
        const existing = toNorm(unique[idx], eSrc);
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
      duplicatesRemoved: dups,
      mergedTotal: unique.length,
    },
  };
}

/**
 * Remove duplicate records within a single input set, keeping the first
 * occurrence of each (artist, track, timestamp) triple.
 */
export function deduplicateInputRecords(
  records: PlayRecord[]
): { unique: PlayRecord[]; duplicates: number } {
  const seen = new Map<string, PlayRecord>();
  let dups = 0;
  for (const r of records) {
    const key = `${(r.artists[0]?.artistName ?? '').toLowerCase()}|||${r.trackName.toLowerCase()}|||${r.playedTime}`;
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
