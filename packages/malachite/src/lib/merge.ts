import type { PlayRecord, Config } from '../types.js';
import { parseLastFmCsv, convertToPlayRecord } from './csv.js';
import { parseSpotifyJson, convertSpotifyToPlayRecord } from './spotify.js';
import { parseAppleMusicCsv, convertAppleMusicToPlayRecord } from './apple-music.js';
import { parseYouTubeMusicJson, convertYouTubeMusicToPlayRecord } from './youtube-music.js';
import { formatDate, normalizeString } from '../utils/helpers.js';
import { log } from '../utils/logger.js';

/**
 * Normalized record for comparison
 */
interface NormalizedRecord {
  original: PlayRecord;
  normalizedTrack: string;
  normalizedArtist: string;
  timestamp: number;
  source: 'lastfm' | 'spotify' | 'apple' | 'youtube';
}

/**
 * Check if two records represent the same play
 * They match if they have:
 * 1. The same timestamp (within 5 minutes)
 * 2. The same normalized track name
 * 3. The same normalized artist name
 */
function areRecordsDuplicates(a: NormalizedRecord, b: NormalizedRecord): boolean {
  // Check timestamp within 5 minutes (300000 ms)
  const timeDiff = Math.abs(a.timestamp - b.timestamp);
  if (timeDiff > 300000) {
    return false;
  }

  // Check normalized track and artist
  return (
    a.normalizedTrack === b.normalizedTrack &&
    a.normalizedArtist === b.normalizedArtist
  );
}

/**
 * Choose the better record between two duplicates
 * Prefer Last.fm if it has MusicBrainz IDs, otherwise prefer Spotify
 */
function chooseBetterRecord(a: NormalizedRecord, b: NormalizedRecord): PlayRecord {
  // Prefer Last.fm if it has any MusicBrainz IDs
  const aHasMbIds = a.source === 'lastfm' && (
    a.original.recordingMbId ||
    a.original.releaseMbId ||
    (a.original.artists[0]?.artistMbId)
  );

  const bHasMbIds = b.source === 'lastfm' && (
    b.original.recordingMbId ||
    b.original.releaseMbId ||
    (b.original.artists[0]?.artistMbId)
  );

  if (aHasMbIds && !bHasMbIds) return a.original;
  if (bHasMbIds && !aHasMbIds) return b.original;

  // Otherwise prefer Spotify/Apple for their better metadata quality over YouTube
  if (a.source === 'spotify') return a.original;
  if (b.source === 'spotify') return b.original;
  if (a.source === 'apple') return a.original;
  if (b.source === 'apple') return b.original;

  // Default to first record
  return a.original;
}

/**
 * Merge and deduplicate records from multiple sources
 */
function mergeRecords(
  lastfmRecords: PlayRecord[],
  spotifyRecords: PlayRecord[],
  appleRecords: PlayRecord[] = [],
  youtubeRecords: PlayRecord[] = []
): { merged: PlayRecord[]; stats: MergeStats } {
  log.info('Merging all exports...');
  log.blank();
  
  const stats: MergeStats = {
    lastfmTotal: lastfmRecords.length,
    spotifyTotal: spotifyRecords.length,
    appleTotal: appleRecords.length,
    youtubeTotal: youtubeRecords.length,
    duplicatesRemoved: 0,
    lastfmUnique: 0,
    spotifyUnique: 0,
    appleUnique: 0,
    youtubeUnique: 0,
    mergedTotal: 0,
  };

  // Normalize all records
  const normalizedLastFm: NormalizedRecord[] = lastfmRecords.map(record => ({
    original: record,
    normalizedTrack: normalizeString(record.trackName),
    normalizedArtist: normalizeString(record.artists[0]?.artistName || ''),
    timestamp: new Date(record.playedTime).getTime(),
    source: 'lastfm' as const,
  }));

  const normalizedSpotify: NormalizedRecord[] = spotifyRecords.map(record => ({
    original: record,
    normalizedTrack: normalizeString(record.trackName),
    normalizedArtist: normalizeString(record.artists[0]?.artistName || ''),
    timestamp: new Date(record.playedTime).getTime(),
    source: 'spotify' as const,
  }));

  const normalizedApple: NormalizedRecord[] = appleRecords.map(record => ({
    original: record,
    normalizedTrack: normalizeString(record.trackName),
    normalizedArtist: normalizeString(record.artists[0]?.artistName || ''),
    timestamp: new Date(record.playedTime).getTime(),
    source: 'apple' as const,
  }));

  const normalizedYouTube: NormalizedRecord[] = youtubeRecords.map(record => ({
    original: record,
    normalizedTrack: normalizeString(record.trackName),
    normalizedArtist: normalizeString(record.artists[0]?.artistName || ''),
    timestamp: new Date(record.playedTime).getTime(),
    source: 'youtube' as const,
  }));

  // Combine all records
  const allRecords = [...normalizedLastFm, ...normalizedSpotify, ...normalizedApple, ...normalizedYouTube];

  // Sort by timestamp
  allRecords.sort((a, b) => a.timestamp - b.timestamp);

  // Deduplicate
  const uniqueRecords: PlayRecord[] = [];
  const seen = new Set<string>();

  for (const record of allRecords) {
    // Create a key for duplicate detection
    const key = `${record.normalizedTrack}|${record.normalizedArtist}|${Math.floor(record.timestamp / 60000)}`; // Round to minute

    if (seen.has(key)) {
      // Find the existing record to compare
      const existingIndex = uniqueRecords.findIndex(r => {
        let eSrc: 'lastfm' | 'spotify' | 'apple' | 'youtube' = 'spotify';
        if (r.musicServiceBaseDomain === 'last.fm') eSrc = 'lastfm';
        else if (r.musicServiceBaseDomain === 'music.apple.com') eSrc = 'apple';
        else if (r.musicServiceBaseDomain === 'music.youtube.com') eSrc = 'youtube';

        const normalized: NormalizedRecord = {
          original: r,
          normalizedTrack: normalizeString(r.trackName),
          normalizedArtist: normalizeString(r.artists[0]?.artistName || ''),
          timestamp: new Date(r.playedTime).getTime(),
          source: eSrc,
        };
        return areRecordsDuplicates(record, normalized);
      });

      if (existingIndex !== -1) {
        // This is a duplicate - choose the better one
        let eeSrc: 'lastfm' | 'spotify' | 'apple' | 'youtube' = 'spotify';
        const exDom = uniqueRecords[existingIndex].musicServiceBaseDomain;
        if (exDom === 'last.fm') eeSrc = 'lastfm';
        else if (exDom === 'music.apple.com') eeSrc = 'apple';
        else if (exDom === 'music.youtube.com') eeSrc = 'youtube';

        const existing: NormalizedRecord = {
          original: uniqueRecords[existingIndex],
          normalizedTrack: normalizeString(uniqueRecords[existingIndex].trackName),
          normalizedArtist: normalizeString(uniqueRecords[existingIndex].artists[0]?.artistName || ''),
          timestamp: new Date(uniqueRecords[existingIndex].playedTime).getTime(),
          source: eeSrc,
        };

        uniqueRecords[existingIndex] = chooseBetterRecord(existing, record);
        stats.duplicatesRemoved++;
        continue;
      }
    }

    seen.add(key);
    uniqueRecords.push(record.original);

    // Track source statistics
    if (record.source === 'lastfm') {
      stats.lastfmUnique++;
    } else if (record.source === 'spotify') {
      stats.spotifyUnique++;
    } else if (record.source === 'apple') {
      stats.appleUnique++;
    } else {
      stats.youtubeUnique++;
    }
  }

  stats.mergedTotal = uniqueRecords.length;

  // Sort final records chronologically
  uniqueRecords.sort((a, b) => {
    const timeA = new Date(a.playedTime).getTime();
    const timeB = new Date(b.playedTime).getTime();
    return timeA - timeB;
  });

  return { merged: uniqueRecords, stats };
}

/**
 * Statistics about the merge operation
 */
export interface MergeStats {
  lastfmTotal: number;
  spotifyTotal: number;
  appleTotal: number;
  youtubeTotal: number;
  duplicatesRemoved: number;
  lastfmUnique: number;
  spotifyUnique: number;
  appleUnique: number;
  youtubeUnique: number;
  mergedTotal: number;
}

/**
 * Display merge statistics
 */
function displayMergeStats(stats: MergeStats, merged: PlayRecord[]): void {
  log.blank();
  log.section('Merge Statistics');
  log.info(`Last.fm: ${stats.lastfmTotal.toLocaleString()} records`);
  log.info(`Spotify: ${stats.spotifyTotal.toLocaleString()} records`);
  log.info(`Apple Music: ${stats.appleTotal.toLocaleString()} records`);
  log.info(`YouTube Music: ${stats.youtubeTotal.toLocaleString()} records`);
  log.info(`Duplicates: ${stats.duplicatesRemoved.toLocaleString()} removed`);
  log.info(`Result: ${stats.mergedTotal.toLocaleString()} unique records`);

  if (merged.length > 0) {
    const firstPlay = formatDate(merged[0].playedTime);
    const lastPlay = formatDate(merged[merged.length - 1].playedTime);
    log.info(`Range: ${firstPlay} to ${lastPlay}`);
  }
  log.blank();
}

/**
 * Parse and merge Last.fm and Spotify exports
 */
export function parseCombinedExports(
  paths: { lastfm?: string, spotify?: string, apple?: string, youtube?: string },
  config: Config,
  debug = false
): PlayRecord[] {
  log.section('Combined Import Mode');
  log.blank();

  let lastfmRecords: PlayRecord[] = [];
  let spotifyRecords: PlayRecord[] = [];
  let appleRecords: PlayRecord[] = [];
  let youtubeRecords: PlayRecord[] = [];

  if (paths.lastfm) {
    log.info('Parsing Last.fm export...');
    const lastfmCsvRecords = parseLastFmCsv(paths.lastfm);
    lastfmRecords = lastfmCsvRecords.map(r => convertToPlayRecord(r, config, debug));
  }

  if (paths.spotify) {
    log.info('Parsing Spotify export...');
    const spotifyJsonRecords = parseSpotifyJson(paths.spotify);
    spotifyRecords = spotifyJsonRecords.map(r => convertSpotifyToPlayRecord(r, config, debug));
  }

  if (paths.apple) {
    log.info('Parsing Apple Music export...');
    const appleCsvRecords = parseAppleMusicCsv(paths.apple);
    appleRecords = appleCsvRecords.map(r => convertAppleMusicToPlayRecord(r, config, debug));
  }

  if (paths.youtube) {
    log.info('Parsing YouTube Music export...');
    const youtubeJsonRecords = parseYouTubeMusicJson(paths.youtube);
    youtubeRecords = youtubeJsonRecords.map(r => convertYouTubeMusicToPlayRecord(r, config, debug));
  }

  // Merge and deduplicate
  const { merged, stats } = mergeRecords(lastfmRecords, spotifyRecords, appleRecords, youtubeRecords);

  // Display statistics
  displayMergeStats(stats, merged);

  return merged;
}
