/**
 * Combined-mode import — CLI wrapper.
 * File parsing and progress logging are CLI-specific; the actual merge and
 * preference-based dedup algorithm is shared with the web app via
 * @ewanc26/croft-click-core so the two never diverge.
 */

import type { PlayRecord, Config } from '../types.js';
import type { MergeStats } from '@ewanc26/croft-click-core';
import { mergePlayRecords } from '@ewanc26/croft-click-core';
import { parseLastFmCsv, convertToPlayRecord } from './csv.js';
import { parseSpotifyJson, convertSpotifyToPlayRecord } from './spotify.js';
import {
  parseAppleMusicCsv,
  parseAppleMusicDailyTracksCsv,
  convertAppleMusicRecords,
} from './apple-music.js';
import { parseYouTubeMusicJson, convertYouTubeMusicToPlayRecord } from './youtube-music.js';
import { parseListenBrainzJson, convertListenBrainzToPlayRecord } from './listenbrainz.js';
import { formatDate } from '../utils/helpers.js';
import { log } from '../utils/logger.js';

export type { MergeStats };

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
  log.info(`ListenBrainz: ${stats.listenbrainzTotal.toLocaleString()} records`);
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
 * Parse and merge exports from any combination of supported sources.
 */
export function parseCombinedExports(
  paths: { lastfm?: string, spotify?: string, apple?: string, appleDailyTracks?: string, youtube?: string, listenbrainz?: string },
  config: Config,
  debug = false
): PlayRecord[] {
  log.section('Combined Import Mode');
  log.blank();

  let lastfmRecords: PlayRecord[] = [];
  let spotifyRecords: PlayRecord[] = [];
  let appleRecords: PlayRecord[] = [];
  let youtubeRecords: PlayRecord[] = [];
  let listenbrainzRecords: PlayRecord[] = [];

  if (paths.lastfm) {
    log.info('Parsing Last.fm export...');
    const lastfmCsvRecords = parseLastFmCsv(paths.lastfm);
    lastfmRecords = lastfmCsvRecords.map(r => convertToPlayRecord(r, config, debug));
  }

  if (paths.spotify) {
    log.info('Parsing Spotify export...');
    const spotifyJsonRecords = parseSpotifyJson(paths.spotify);
    spotifyRecords = spotifyJsonRecords.map(r => convertSpotifyToPlayRecord(r, config, debug)).filter((r): r is PlayRecord => r !== null);
  }

  if (paths.apple) {
    log.info('Parsing Apple Music export...');
    const appleCsvRecords = parseAppleMusicCsv(paths.apple);
    const appleArtists = paths.appleDailyTracks
      ? parseAppleMusicDailyTracksCsv(paths.appleDailyTracks)
      : undefined;
    appleRecords = convertAppleMusicRecords(appleCsvRecords, appleArtists);
  }

  if (paths.youtube) {
    log.info('Parsing YouTube Music export...');
    const youtubeJsonRecords = parseYouTubeMusicJson(paths.youtube);
    youtubeRecords = youtubeJsonRecords.map(r => convertYouTubeMusicToPlayRecord(r, config, debug)).filter((r): r is PlayRecord => r !== null);
  }

  if (paths.listenbrainz) {
    log.info('Parsing ListenBrainz export...');
    const listenbrainzJsonRecords = parseListenBrainzJson(paths.listenbrainz);
    listenbrainzRecords = listenbrainzJsonRecords.map(r => convertListenBrainzToPlayRecord(r, config, debug)).filter((r): r is PlayRecord => r !== null);
  }

  log.info('Merging all exports...');
  log.blank();

  const { merged, stats } = mergePlayRecords(lastfmRecords, spotifyRecords, appleRecords, youtubeRecords, listenbrainzRecords);

  displayMergeStats(stats, merged);

  return merged;
}
