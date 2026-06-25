/**
 * Import orchestration logic — pure TypeScript, no Svelte deps.
 * Handles all seven ImportMode flows with progress + cancellation callbacks.
 *
 * All heavy logic (publisher, sync, merge) lives in src/core/ and is shared
 * with the CLI. Only the browser File-loading helpers and this orchestrator
 * are web-specific.
 */

import type { Agent } from '@atproto/api';
import type { ImportMode, LogEntry, PlayRecord } from '$lib/types.js';
import { CLIENT_AGENT } from '../config.js';
import { parseLastFmFile, convertToPlayRecord } from './csv.js';
import { parseSpotifyFiles, convertSpotifyToPlayRecord } from './spotify.js';
import { parseAppleMusicFile, convertAppleMusicToPlayRecord } from './apple-music.js';
import { parseYouTubeMusicFiles, convertYouTubeMusicToPlayRecord } from './youtube-music.js';
import { mergePlayRecords, deduplicateInputRecords, sortRecords } from '@ewanc26/croft-click-core';
import {
  fetchExistingRecords,
  filterNewRecords,
  fetchAllRecordsForDedup,
  findDuplicateGroups,
  removeDuplicateRecords,
  type ExistingRecord,
} from '@ewanc26/croft-click-core';
import { publishRecords, type PublishProgress } from '@ewanc26/croft-click-core';

export type { PublishProgress };

import { loadRecordsCache, saveRecordsCache } from './web-cache.js';

export interface ImportOptions {
  dryRun: boolean;
  reverseOrder: boolean;
  fresh: boolean;
}

export interface ImportResult {
  success: number;
  errors: number;
  cancelled: boolean;
}

export interface ImportCallbacks {
  onLog: (level: LogEntry['level'], message: string) => void;
  onProgress: (p: PublishProgress) => void;
  isCancelled: () => boolean;
}

export async function runImport(
  agent: Agent,
  mode: ImportMode,
  lastfmFiles: File[],
  spotifyFiles: File[],
  appleFiles: File[],
  youtubeFiles: File[],
  { dryRun, reverseOrder, fresh }: ImportOptions,
  { onLog, onProgress, isCancelled }: ImportCallbacks,
  /** Number of records to skip when resuming a previous import. */
  startIndex = 0,
): Promise<ImportResult> {
  // Single AbortController for every network call in this run.
  const ac = new AbortController();
  const poll = setInterval(() => { if (isCancelled()) ac.abort(); }, 50);
  const sig = ac.signal;

  const run = async (): Promise<ImportResult> => {
    // ── Deduplicate mode ─────────────────────────────────────────────────────
    if (mode === 'deduplicate') {
      onLog('section', '── Deduplication ──────────────────────────────────');
      onLog('info', 'Fetching existing records from Teal…');
      const all = await fetchAllRecordsForDedup(
        agent,
        (n) => onLog('progress', `  Fetched ${n.toLocaleString()} records…`),
        sig,
      );
      onLog('success', `Fetched ${all.length.toLocaleString()} records`);

      const groups = findDuplicateGroups(all);
      const totalDups = groups.reduce((s, g) => s + g.records.length - 1, 0);

      if (totalDups === 0) {
        onLog('success', 'No duplicates found — your records are clean.');
        return { success: 0, errors: 0, cancelled: false };
      }
      onLog('warn', `Found ${totalDups.toLocaleString()} duplicate(s) across ${groups.length} groups`);

      if (dryRun) {
        onLog('info', `[DRY RUN] Would remove ${totalDups} duplicate record(s).`);
        return { success: totalDups, errors: 0, cancelled: false };
      }

      onLog('info', 'Removing duplicates…');
      const removed = await removeDuplicateRecords(
        agent,
        groups,
        (n) => onLog('progress', `  Removed ${n}/${totalDups}…`),
        sig,
      );
      onLog('success', `Removed ${removed.toLocaleString()} duplicate(s)`);
      return { success: removed, errors: 0, cancelled: false };
    }

    // ── Load records ─────────────────────────────────────────────────────────
    onLog('section', '── Loading Records ─────────────────────────────────');
    let records: PlayRecord[] = [];

    if (mode === 'combined') {
      let combinedRecords: PlayRecord[] = [];
      
      if (lastfmFiles.length > 0) {
        const lfRaw = await parseLastFmFile(lastfmFiles[0]);
        onLog('info', `Last.fm: ${lfRaw.length.toLocaleString()} scrobbles`);
        combinedRecords = combinedRecords.concat(lfRaw.map(r => convertToPlayRecord(r, CLIENT_AGENT)));
      }
      
      if (spotifyFiles.length > 0) {
        const spRaw = await parseSpotifyFiles(spotifyFiles);
        onLog('info', `Spotify: ${spRaw.length.toLocaleString()} tracks`);
        combinedRecords = combinedRecords.concat(spRaw.map(r => convertSpotifyToPlayRecord(r, CLIENT_AGENT)));
      }

      if (appleFiles.length > 0) {
        const amRaw = await parseAppleMusicFile(appleFiles[0]);
        onLog('info', `Apple Music: ${amRaw.length.toLocaleString()} plays`);
        combinedRecords = combinedRecords.concat(amRaw.map(r => convertAppleMusicToPlayRecord(r, CLIENT_AGENT)));
      }

      if (youtubeFiles.length > 0) {
        const ytRaw = await parseYouTubeMusicFiles(youtubeFiles);
        onLog('info', `YouTube Music: ${ytRaw.length.toLocaleString()} plays`);
        combinedRecords = combinedRecords.concat(ytRaw.map(r => convertYouTubeMusicToPlayRecord(r, CLIENT_AGENT)));
      }

      const { unique, duplicates: inputDups } = deduplicateInputRecords(combinedRecords);
      records = unique;
      onLog('success', `Merged: ${records.length.toLocaleString()} unique records (${inputDups} duplicates removed)`);
    } else if (mode === 'spotify') {
      const spRaw = await parseSpotifyFiles(spotifyFiles);
      records = spRaw.map((r) => convertSpotifyToPlayRecord(r, CLIENT_AGENT));
      onLog('success', `Loaded ${records.length.toLocaleString()} Spotify records`);
    } else if (mode === 'apple') {
      const amRaw = await parseAppleMusicFile(appleFiles[0]);
      records = amRaw.map((r) => convertAppleMusicToPlayRecord(r, CLIENT_AGENT));
      onLog('success', `Loaded ${records.length.toLocaleString()} Apple Music records`);
    } else if (mode === 'youtube') {
      const ytRaw = await parseYouTubeMusicFiles(youtubeFiles);
      records = ytRaw.map((r) => convertYouTubeMusicToPlayRecord(r, CLIENT_AGENT));
      onLog('success', `Loaded ${records.length.toLocaleString()} YouTube Music records`);
    } else {
      const lfRaw = await parseLastFmFile(lastfmFiles[0]);
      records = lfRaw.map((r) => convertToPlayRecord(r, CLIENT_AGENT));
      onLog('success', `Loaded ${records.length.toLocaleString()} Last.fm records`);
    }

    if (mode !== 'combined') {
      const { unique, duplicates: inputDups } = deduplicateInputRecords(records);
      records = unique;
      if (inputDups > 0) onLog('warn', `Removed ${inputDups.toLocaleString()} duplicate(s) from input`);
    }

    // ── Sync check (CAR primary; applyWrites fallback) ───────────────────────
    onLog('section', '── Sync Check ───────────────────────────────────────');
    onLog('info', 'Fetching existing records via CAR export…');
    let existing: Map<string, ExistingRecord>;
    let carSyncOk = true;

    // Check web cache (sessionStorage with 24h TTL) before fetching.
    const did = agent.did ?? (agent as any)?.sessionManager?.did;
    let fromCache = false;
    if (!fresh && did) {
      const cached = loadRecordsCache(did);
      if (cached) {
        existing = cached as Map<string, ExistingRecord>;
        carSyncOk = true;
        fromCache = true;
        onLog('success', `Loaded ${existing.size.toLocaleString()} existing records from cache`);
      }
    }

    if (!fromCache) {
      try {
        existing = await fetchExistingRecords(
          agent,
          (n) => onLog('progress', `  Fetched ${n.toLocaleString()} existing records…`),
          fresh,
          sig,
        );
        // Persist to web cache (skip if fresh, since the user explicitly asked
        // to bypass caches — the in-memory session cache in the core is fine).
        if (did && !fresh && existing.size > 0) {
          saveRecordsCache(did, existing as any);
        }
      } catch (carErr) {
        carSyncOk = false;
        const msg = carErr instanceof Error ? carErr.message : String(carErr);
        onLog('warn', `⚠️  CAR sync check unavailable: ${msg}`);
        onLog('warn', `   Falling back to full applyWrites — existing records will be rejected by the PDS, new ones will land correctly.`);
        existing = new Map();
      }
    }
    const before = records.length;
    records = filterNewRecords(records, existing);
    if (carSyncOk) {
      const skipped = before - records.length;
      if (skipped > 0) onLog('info', `Skipped ${skipped.toLocaleString()} already-imported record(s)`);
      onLog('success', `${records.length.toLocaleString()} new record(s) to import`);
    } else {
      onLog('info', `${records.length.toLocaleString()} record(s) queued for import (deduplication skipped — CAR unavailable)`);
    }

    if (records.length === 0) {
      onLog('success', '✓ Nothing to import — all records already exist in Teal!');
      return { success: 0, errors: 0, cancelled: false };
    }
    if (mode !== 'combined') records = sortRecords(records, reverseOrder);

    // ── Resume support ──────────────────────────────────────────────────────
    if (startIndex > 0) {
      if (startIndex >= records.length) {
        onLog('success', `✓ All ${startIndex.toLocaleString()} records were already published in the previous session. Nothing more to do.`);
        return { success: 0, errors: 0, cancelled: false };
      }
      onLog('info', `Resuming from record ${startIndex + 1} — skipping ${startIndex.toLocaleString()} already-published record(s)`);
      records = records.slice(startIndex);
    }

    // ── Publish ──────────────────────────────────────────────────────────────
    onLog('section', '── Publishing ───────────────────────────────────────');
    onLog('warn', 'Do not close this tab while publishing.');
    const res = await publishRecords(agent, records, dryRun, {
      onProgress,
      onLog: (level, msg) => onLog(level as LogEntry['level'], msg),
      isCancelled,
    });
    
    if (!dryRun && !res.cancelled && res.successCount > 0) {
      try {
        await agent.com.atproto.repo.createRecord({
          repo: agent.session?.did ?? agent.did ?? '',
          collection: 'click.croft.toolkit.use',
          record: {
            $type: 'click.croft.toolkit.use',
            tool: {
              $type: 'click.croft.tools.malachite',
              recordsImported: res.successCount,
              mode: mode,
            },
            createdAt: new Date().toISOString()
          }
        });
      } catch (err) {
        onLog('warn', `Failed to log toolkit usage: ${(err as Error).message}`);
      }
    }

    return { success: res.successCount, errors: res.errorCount, cancelled: res.cancelled };
  };

  try {
    return await run();
  } catch (err: unknown) {
    if (ac.signal.aborted) return { success: 0, errors: 0, cancelled: true };
    throw err;
  } finally {
    clearInterval(poll);
  }
}
