/**
 * Import orchestration logic — pure TypeScript, no Svelte deps.
 * Handles all eight ImportMode flows with progress + cancellation callbacks.
 *
 * All heavy logic (publisher, sync, merge) lives in src/core/ and is shared
 * with the CLI. Only the browser File-loading helpers and this orchestrator
 * are web-specific.
 */

import type { Client } from '@atproto/lex';
import type { ImportMode, LogEntry, PlayRecord } from '$lib/types.js';
import { CLIENT_AGENT } from '../config.js';
import { parseLastFmFile, convertToPlayRecord } from './csv.js';
import { parseSpotifyFiles, convertSpotifyToPlayRecord } from './spotify.js';
import {
  parseAppleMusicFile,
  parseAppleMusicDailyTracksFile,
  splitAppleMusicFiles,
  convertAppleMusicRecords,
} from './apple-music.js';
import { enrichWithMusicBrainz } from '@ewanc26/croft-click-core';
import { parseYouTubeMusicFiles, convertYouTubeMusicToPlayRecord } from './youtube-music.js';
import { parseListenBrainzFiles, convertListenBrainzToPlayRecord } from './listenbrainz.js';
import { mergePlayRecords, deduplicateInputRecords, sortRecords } from '@ewanc26/croft-click-core';
import {
  fetchExistingRecords,
  clearExistingRecordsCache,
  filterNewRecords,
  fetchAllRecordsForDedup,
  buildDedupPlan,
  removeDuplicateRecords,
  type ExistingRecord,
} from '@ewanc26/croft-click-core';
import { publishRecords, type PublishProgress, type PermitWaitInfo } from '@ewanc26/croft-click-core';
import { analyzeLegacyRecords, migrateLegacyRecords } from '@ewanc26/croft-click-core';
import {
  canWriteRocksky,
  fetchRockskyScrobbles,
  planRockskyCrossPost,
  ROCKSKY_PUBLISH_TARGET,
  buildRockskyDedupPlan,
  type DedupPlan,
} from '@ewanc26/croft-click-core';
import { com } from '@bsky/sdk/lexicons'

export type { PublishProgress, PermitWaitInfo };

import { loadRecordsCache, saveRecordsCache, clearRecordsCache } from './web-cache.js';

/**
 * MusicBrainz rejects or throttles clients that don't identify themselves with
 * a contactable User-Agent, so this must stay specific and reachable.
 * https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
 */
const MUSICBRAINZ_USER_AGENT = `${CLIENT_AGENT} ( https://github.com/ewanc26/pkgs )`;

export interface ImportOptions {
  dryRun: boolean;
  reverseOrder: boolean;
  fresh: boolean;
  /**
   * Look missing artists up on MusicBrainz before publishing. Off by default:
   * it's rate-limited to one request per second, so a large gap list takes
   * hours, and the import works fine without it.
   */
  enrichFromMusicBrainz?: boolean;
  dangerZone?: boolean;
  /** Also write plays as rocksky scrobbles (import, polish), or dedupe them (deduplicate). */
  rocksky?: boolean;
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
  /** The current quota wait, or null once writing again. */
  onWaiting: (wait: PermitWaitInfo | null) => void;
  /** Polled during a quota wait; true once ends it and retries. */
  retryNow: () => boolean;
}

/**
 * Load Apple Music plays from the uploaded CSV(s).
 *
 * Current Apple exports have no artist column. Plays whose artist can't be
 * resolved from the optional daily-tracks companion still import, just without
 * one — and the count is logged, since a quietly incomplete import is what made
 * this hard to diagnose in the first place.
 */
async function loadAppleMusic(
  appleFiles: File[],
  onLog: (level: LogEntry['level'], message: string) => void
): Promise<PlayRecord[]> {
  const { playActivity, dailyTracks } = await splitAppleMusicFiles(appleFiles);
  if (!playActivity) return [];

  const artistLookup = dailyTracks ? await parseAppleMusicDailyTracksFile(dailyTracks) : undefined;
  if (artistLookup) {
    onLog('info', `Apple Music: recovered ${artistLookup.size.toLocaleString()} artist names from ${dailyTracks!.name}`);
  }

  const raw = await parseAppleMusicFile(playActivity);
  const { records, withoutArtist } = convertAppleMusicRecords(raw, artistLookup);
  onLog('info', `Apple Music: ${records.length.toLocaleString()} plays`);

  if (withoutArtist > 0) {
    onLog(
      'warn',
      `${withoutArtist.toLocaleString()} of ${records.length.toLocaleString()} play(s) have no ` +
        `artist name. Apple's current export omits the artist column — also select ` +
        `"Apple Music - Play History Daily Tracks.csv" from the same folder to fill them in.`
    );
  }

  return records;
}

/**
 * Fill in missing artists from MusicBrainz.
 *
 * MusicBrainz allows one request per second, so this is opt-in and paced
 * accordingly — an hour per ~3,600 gaps. Failures are per-record and silent by
 * design: a record that can't be matched is passed through untouched.
 */
async function enrichRecords(
  records: PlayRecord[],
  onLog: (level: LogEntry['level'], message: string) => void,
  signal: AbortSignal
): Promise<PlayRecord[]> {
  const gaps = records.filter((r) => !r.artists?.length).length;
  if (gaps === 0) return records;

  onLog('section', '── MusicBrainz ──────────────────────────────────────');
  onLog(
    'info',
    `Looking up ${gaps.toLocaleString()} new play(s) with no artist. MusicBrainz allows one ` +
      `request per second, so this takes about ${formatDuration(gaps)}.`
  );

  let lastLogged = 0;
  const { records: enrichedRecords, enriched } = await enrichWithMusicBrainz(records, {
    userAgent: MUSICBRAINZ_USER_AGENT,
    signal,
    onProgress: ({ processed, total }) => {
      // One line every 50 lookups; per-record logging would flood the view.
      if (processed - lastLogged >= 50 || processed === total) {
        lastLogged = processed;
        onLog('progress', `  ${processed.toLocaleString()}/${total.toLocaleString()} looked up…`);
      }
    },
  });

  onLog('success', `Filled in ${enriched.toLocaleString()} artist name(s) from MusicBrainz`);
  return enrichedRecords;
}

/**
 * Write a rocksky scrobble for each play rocksky doesn't have yet. When the
 * existing scrobbles can't be read this writes nothing, because writing without
 * checking would duplicate every play rocksky already has.
 */
async function crossPostToRocksky(
  client: Client,
  plays: PlayRecord[],
  dryRun: boolean,
  dangerZone: boolean,
  { onLog, isCancelled, onWaiting, retryNow }: ImportCallbacks,
  signal: AbortSignal
): Promise<ImportResult> {
  onLog('section', '── Rocksky ──────────────────────────────────────────');
  onLog('info', 'Fetching existing Rocksky scrobbles via CAR export…');
  let existing: Awaited<ReturnType<typeof fetchRockskyScrobbles>>;
  try {
    existing = await fetchRockskyScrobbles(client, signal);
  } catch (err) {
    // Stopped by the user: report a stop, so the teal result still shows.
    if (signal.aborted) return { success: 0, errors: 0, cancelled: true };
    onLog('warn', `Could not read Rocksky scrobbles: ${err instanceof Error ? err.message : String(err)}`);
    onLog('warn', 'Skipping the Rocksky cross-post: writing without checking would duplicate plays Rocksky already has.');
    return { success: 0, errors: 0, cancelled: false };
  }

  const plan = planRockskyCrossPost(plays, existing);
  onLog('info', `${plan.alreadyInRocksky.toLocaleString()} play(s) already in Rocksky`);
  if (plan.duplicates > 0) onLog('info', `${plan.duplicates.toLocaleString()} near-duplicate play(s) folded together`);
  if (plan.incomplete > 0) onLog('warn', `${plan.incomplete.toLocaleString()} play(s) skipped: no artist, title or valid time`);
  if (plan.toPublish.length === 0) {
    onLog('success', 'Rocksky already has every play.');
    return { success: 0, errors: 0, cancelled: false };
  }

  onLog('info', `${plan.toPublish.length.toLocaleString()} play(s) to cross-post`);
  const res = await publishRecords(client, plan.toPublish, dryRun, {
    // The page saves onProgress counts as the teal import's resume offset, so
    // rocksky progress must not reach it. Per-batch log lines still show it.
    onProgress: (p) => onWaiting(p.waiting ?? null),
    onLog: (level, msg) => onLog(level as LogEntry['level'], msg),
    isCancelled,
    retryNow,
  }, 'rocksky', dangerZone, false, ROCKSKY_PUBLISH_TARGET);
  if (!dryRun && !res.cancelled) {
    onLog('success', `Cross-posted ${res.successCount.toLocaleString()} scrobble(s) to Rocksky`);
    if (res.errorCount > 0) onLog('warn', `${res.errorCount.toLocaleString()} Rocksky scrobble(s) failed. Run Polish with Cross-post to Rocksky on to retry them.`);
  }
  return { success: res.successCount, errors: res.errorCount, cancelled: res.cancelled };
}

/** Rough human-readable duration for a one-request-per-second job. */
function formatDuration(requests: number): string {
  const seconds = Math.ceil(requests * 1.1);
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} hours`;
}

export async function runImport(
  client: Client,
  mode: ImportMode,
  lastfmFiles: File[],
  spotifyFiles: File[],
  appleFiles: File[],
  youtubeFiles: File[],
  listenbrainzFiles: File[],
  { dryRun, reverseOrder, fresh, enrichFromMusicBrainz, dangerZone, rocksky }: ImportOptions,
  callbacks: ImportCallbacks,
  /** Number of records to skip when resuming a previous import. */
  startIndex = 0,
): Promise<ImportResult> {
  const { onLog, onProgress, isCancelled, onWaiting, retryNow } = callbacks;
  // Single AbortController for every network call in this run.
  const ac = new AbortController();
  const poll = setInterval(() => { if (isCancelled()) ac.abort(); }, 50);
  const sig = ac.signal;

  const run = async (): Promise<ImportResult> => {
    if (rocksky && !(await canWriteRocksky(client))) {
      const message = "This sign-in doesn't allow writing Rocksky scrobbles yet. Sign out and sign in again to grant it.";
      if (!dryRun) throw new Error(message);
      onLog('warn', message);
    }

    // Rocksky goes after teal in every mode, so stopping during the teal step
    // stops both. Returns whether the rocksky step was stopped.
    const crossPost = async (plays: PlayRecord[]): Promise<boolean> =>
      rocksky
        ? (await crossPostToRocksky(client, plays, dryRun, dangerZone ?? false, callbacks, sig)).cancelled
        : false;

    // ── Deduplicate mode ─────────────────────────────────────────────────────
    if (mode === 'deduplicate') {
      onLog('section', '── Deduplication ──────────────────────────────────');
      onLog('info', 'Fetching existing records from Teal…');
      const all = await fetchAllRecordsForDedup(
        client,
        (n) => onLog('progress', `  Fetched ${n.toLocaleString()} records…`),
        sig,
      );
      onLog('success', `Fetched ${all.length.toLocaleString()} records`);

      const plan = buildDedupPlan(all);

      // Rocksky scrobbles get their own plan: a teal play and its rocksky
      // cross-post are one listen in two collections, not duplicates.
      let rockskyPlan: DedupPlan | null = null;
      if (rocksky) {
        onLog('info', 'Fetching Rocksky scrobbles…');
        const scrobbles = await fetchRockskyScrobbles(client, sig);
        onLog('success', `Fetched ${scrobbles.length.toLocaleString()} Rocksky scrobble(s)`);
        rockskyPlan = buildRockskyDedupPlan(scrobbles);
      }
      const plans = rockskyPlan ? [plan, rockskyPlan] : [plan];
      const totalDups = plan.totalDuplicates + (rockskyPlan?.totalDuplicates ?? 0);

      if (totalDups === 0) {
        onLog('success', 'No duplicates found — your records are clean.');
        return { success: 0, errors: 0, cancelled: false };
      }
      onLog('warn', `Found ${plan.totalDuplicates.toLocaleString()} duplicate(s) across ${plan.groups.length} groups`);
      if (rockskyPlan) {
        onLog('warn', `Found ${rockskyPlan.totalDuplicates.toLocaleString()} duplicate Rocksky scrobble(s) across ${rockskyPlan.groups.length} groups`);
      }

      if (dryRun) {
        onLog('info', `[DRY RUN] Would remove ${totalDups.toLocaleString()} duplicate record(s).`);
        for (const group of plans.flatMap((p) => p.groups)) {
          onLog('info', `  • keep ${group.keep.value.trackName} — ${group.keep.value.artists?.[0]?.artistName}`);
        }
        return { success: totalDups, errors: 0, cancelled: false };
      }

      onLog('info', 'Removing duplicates…');
      let removed = 0;
      for (const p of plans) {
        if (p.totalDuplicates === 0) continue;
        const done = removed;
        removed += await removeDuplicateRecords(
          client,
          p,
          (n) => {
            onWaiting(null);
            onLog('progress', `  Removed ${done + n}/${totalDups}…`);
          },
          sig,
          { onWait: onWaiting, retryNow },
        );
      }
      onLog('success', `Removed ${removed.toLocaleString()} duplicate(s)`);
      return { success: removed, errors: 0, cancelled: false };
    }

    // ── Polish mode ───────────────────────────────────────────────────────────
    if (mode === 'polish') {
      // With the rocksky option, polish also cross-posts teal plays rocksky is
      // missing. It runs last so that it reads the migrated collection.
      const crossPostTealPlays = async (): Promise<boolean> =>
        rocksky ? crossPost((await fetchAllRecordsForDedup(client, undefined, sig)).map((rec) => rec.value)) : false;

      onLog('section', '── Polish ───────────────────────────────────────────');
      onLog('info', 'Fetching legacy fm.teal.alpha.feed.play records…');
      const plan = await analyzeLegacyRecords(client, sig);

      if (plan.legacyTotal === 0) {
        onLog('success', 'No legacy scrobbles found — nothing to migrate.');
        return { success: 0, errors: 0, cancelled: await crossPostTealPlays() };
      }

      onLog('success', `Found ${plan.legacyTotal.toLocaleString()} legacy scrobble(s)`);
      onLog('info', `  ${plan.toBackfill.length.toLocaleString()} to backfill into fm.teal.feed.play`);
      onLog('info', `  ${plan.toDedupe.length.toLocaleString()} already in production — will drop the legacy copy`);

      if (dryRun) {
        onLog('success', `[DRY RUN] Would backfill ${plan.toBackfill.length.toLocaleString()} record(s) and remove ${plan.legacyTotal.toLocaleString()} legacy copy/copies.`);
        return { success: plan.legacyTotal, errors: 0, cancelled: await crossPostTealPlays() };
      }

      onLog('warn', 'Migrating — legacy copies are only removed after a successful backfill.');
      const polishRes = await migrateLegacyRecords(client, plan, {
        onProgress: (phase, done, total) => {
          onWaiting(null);
          onLog('progress', `  ${phase === 'backfill' ? 'Backfilled' : 'Removed'} ${done}/${total}…`);
        },
        onWait: onWaiting,
        retryNow,
        signal: sig,
      });

      onLog('success', `Backfilled ${polishRes.backfilled.toLocaleString()} scrobble(s) into fm.teal.feed.play`);
      onLog('success', `Removed ${polishRes.deleted.toLocaleString()} legacy copy/copies`);
      if (polishRes.failed > 0) {
        onLog('warn', `${polishRes.failed.toLocaleString()} backfill(s) failed — their legacy copies were kept.`);
      }

      try {
        await client.call(com.atproto.repo.createRecord, {
          repo: client.assertDid,
          collection: 'click.croft.toolkit.use',
          record: {
            $type: 'click.croft.toolkit.use',
            tool: {
              $type: 'click.croft.tools.malachite',
              recordsImported: plan.legacyTotal,
              mode: 'polish',
            },
            createdAt: new Date().toISOString()
          }
        });
      } catch (err) {
        onLog('warn', `Failed to log toolkit usage: ${(err as Error).message}`);
      }

      return { success: polishRes.backfilled + polishRes.deleted, errors: polishRes.failed, cancelled: await crossPostTealPlays() };
    }

    // ── Load records ─────────────────────────────────────────────────────────
    onLog('section', '── Loading Records ─────────────────────────────────');
    let records: PlayRecord[] = [];

    if (mode === 'combined') {
      let lastfmRecords: PlayRecord[] = [];
      let spotifyRecords: PlayRecord[] = [];
      let appleRecords: PlayRecord[] = [];
      let youtubeRecords: PlayRecord[] = [];
      let listenbrainzRecords: PlayRecord[] = [];

      if (lastfmFiles.length > 0) {
        const lfRaw = await parseLastFmFile(lastfmFiles[0]);
        onLog('info', `Last.fm: ${lfRaw.length.toLocaleString()} scrobbles`);
        lastfmRecords = lfRaw.map(r => convertToPlayRecord(r, CLIENT_AGENT));
      }

      if (spotifyFiles.length > 0) {
        const spRaw = await parseSpotifyFiles(spotifyFiles);
        onLog('info', `Spotify: ${spRaw.length.toLocaleString()} tracks`);
        spotifyRecords = spRaw.map(r => convertSpotifyToPlayRecord(r, CLIENT_AGENT)).filter((x): x is PlayRecord => x !== null);
      }

      if (appleFiles.length > 0) {
        appleRecords = await loadAppleMusic(appleFiles, onLog);
      }

      if (youtubeFiles.length > 0) {
        const ytRaw = await parseYouTubeMusicFiles(youtubeFiles);
        onLog('info', `YouTube Music: ${ytRaw.length.toLocaleString()} plays`);
        youtubeRecords = ytRaw.map(r => convertYouTubeMusicToPlayRecord(r, CLIENT_AGENT)).filter((x): x is PlayRecord => x !== null);
      }

      if (listenbrainzFiles.length > 0) {
        const lbRaw = await parseListenBrainzFiles(listenbrainzFiles);
        onLog('info', `ListenBrainz: ${lbRaw.length.toLocaleString()} listens`);
        listenbrainzRecords = lbRaw.map(r => convertListenBrainzToPlayRecord(r, CLIENT_AGENT)).filter((x): x is PlayRecord => x !== null);
      }

      const { merged, stats } = mergePlayRecords(lastfmRecords, spotifyRecords, appleRecords, youtubeRecords, listenbrainzRecords);
      records = merged;
      onLog('success', `Merged: ${records.length.toLocaleString()} unique records (${stats.duplicatesRemoved} duplicates removed)`);
    } else if (mode === 'spotify') {
      const spRaw = await parseSpotifyFiles(spotifyFiles);
      records = spRaw.map((r) => convertSpotifyToPlayRecord(r, CLIENT_AGENT)).filter((x): x is PlayRecord => x !== null);
      onLog('success', `Loaded ${records.length.toLocaleString()} Spotify records`);
    } else if (mode === 'apple') {
      records = await loadAppleMusic(appleFiles, onLog);
      onLog('success', `Loaded ${records.length.toLocaleString()} Apple Music records`);
    } else if (mode === 'youtube') {
      const ytRaw = await parseYouTubeMusicFiles(youtubeFiles);
      records = ytRaw.map((r) => convertYouTubeMusicToPlayRecord(r, CLIENT_AGENT)).filter((x): x is PlayRecord => x !== null);
      onLog('success', `Loaded ${records.length.toLocaleString()} YouTube Music records`);
    } else if (mode === 'listenbrainz') {
      const lbRaw = await parseListenBrainzFiles(listenbrainzFiles);
      records = lbRaw.map((r) => convertListenBrainzToPlayRecord(r, CLIENT_AGENT)).filter((x): x is PlayRecord => x !== null);
      onLog('success', `Loaded ${records.length.toLocaleString()} ListenBrainz records`);
    } else {
      const lfRaw = await parseLastFmFile(lastfmFiles[0]);
      records = lfRaw.map((r) => convertToPlayRecord(r, CLIENT_AGENT));
      onLog('success', `Loaded ${records.length.toLocaleString()} Last.fm records`);
    }

    // Remove exact duplicates from the input before any network enrichment.
    // Combined mode already deduplicates while merging its source arrays.
    if (mode !== 'combined') {
      const { unique, duplicates: inputDups } = deduplicateInputRecords(records);
      records = unique;
      if (inputDups > 0) onLog('warn', `Removed ${inputDups.toLocaleString()} duplicate(s) from input`);
    }

    // ── Sync check (CAR primary; applyWrites fallback) ───────────────────────
    // Check the PDS before MusicBrainz: enrichment is deliberately slow, and
    // there is no reason to enrich a play that is already in Teal.
    onLog('section', '── Sync Check ───────────────────────────────────────');
    onLog('info', 'Fetching existing records via CAR export…');
    let existing: Map<string, ExistingRecord> = new Map();
    let carSyncOk = true;

    // Check web cache (sessionStorage with 24h TTL) before fetching.
    const did = client.assertDid ?? (client as any)?.sessionManager?.did;
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
          client,
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
    const inputRecords = records;
    records = filterNewRecords(records, existing);
    // Input plays teal already has. They aren't imported again, but with the
    // rocksky option they may still be missing from rocksky.
    const newToTeal = new Set(records);
    const alreadyInTeal = inputRecords.filter((record) => !newToTeal.has(record));
    if (carSyncOk) {
      const skipped = before - records.length;
      if (skipped > 0) onLog('info', `Skipped ${skipped.toLocaleString()} already-imported record(s)`);
      onLog('success', `${records.length.toLocaleString()} new record(s) to import`);
    } else {
      onLog('info', `${records.length.toLocaleString()} record(s) queued for import (deduplication skipped — CAR unavailable)`);
    }

    if (records.length === 0) {
      onLog('success', '✓ Nothing to import — all records already exist in Teal!');
      return { success: 0, errors: 0, cancelled: await crossPost(alreadyInTeal) };
    }

    // Only genuinely new artist gaps reach MusicBrainz. This preserves the
    // existing CAR-failure fallback while avoiding hours of redundant lookups
    // during normal imports.
    if (enrichFromMusicBrainz) {
      records = await enrichRecords(records, onLog, ac.signal);

      // Enrichment can make formerly-distinct incomplete input rows converge on
      // the same artist/track/timestamp key, so do one final local dedupe pass.
      const { unique, duplicates: enrichedDups } = deduplicateInputRecords(records);
      records = unique;
      if (enrichedDups > 0) {
        onLog('warn', `Removed ${enrichedDups.toLocaleString()} duplicate(s) after MusicBrainz enrichment`);
      }
    }

    if (mode !== 'combined') records = sortRecords(records, reverseOrder);
    // Taken before the resume slice, so a resumed run still cross-posts every play.
    const rockskyPlays = [...records, ...alreadyInTeal];

    // ── Resume support ──────────────────────────────────────────────────────
    if (startIndex > 0) {
      if (startIndex >= records.length) {
        onLog('success', `✓ All ${startIndex.toLocaleString()} records were already published in the previous session. Nothing more to do.`);
        return { success: 0, errors: 0, cancelled: await crossPost(rockskyPlays) };
      }
      onLog('info', `Resuming from record ${startIndex + 1} — skipping ${startIndex.toLocaleString()} already-published record(s)`);
      records = records.slice(startIndex);
    }

    // ── Publish ──────────────────────────────────────────────────────────────
    // The cached snapshot predates these writes. Drop it before the first one
    // lands, so a stopped or interrupted run is re-checked against the real
    // repo next time instead of re-posting everything it published (#98).
    if (!dryRun) {
      if (did) clearRecordsCache(did);
      clearExistingRecordsCache(did);
    }

    onLog('section', '── Publishing ───────────────────────────────────────');
    onLog('warn', 'Do not close this tab while publishing.');
    let lastProgress: PublishProgress | null = null;
    const res = await publishRecords(client, records, dryRun, {
      onProgress: (p) => { lastProgress = p; onWaiting(p.waiting ?? null); onProgress(p); },
      onLog: (level, msg) => onLog(level as LogEntry['level'], msg),
      isCancelled,
      retryNow,
    }, 'publish', dangerZone ?? false);

    // The page saves progress as the resume offset, and the last update it saw
    // was the start of the final batch. The Rocksky step can run for hours, so
    // mark teal as fully processed first: a reload during it then resumes past
    // teal instead of re-sending that batch.
    if (rocksky && !dryRun && !res.cancelled && lastProgress) {
      const done = startIndex + records.length;
      onProgress({ ...(lastProgress as PublishProgress), recordsProcessed: done, totalRecords: done, successCount: res.successCount, errorCount: res.errorCount });
    }

    if (!dryRun && !res.cancelled && res.successCount > 0) {
      try {
        await client.call(com.atproto.repo.createRecord, {
          repo: client.assertDid,
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

    const stopped = res.cancelled || (await crossPost(rockskyPlays));
    return { success: res.successCount, errors: res.errorCount, cancelled: stopped };
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
