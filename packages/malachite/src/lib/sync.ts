import type { Client } from '@atproto/lex'
import type { PlayRecord, Config } from '../types.js';
import {
  recordKey as recordKeyCore,
  filterNewRecords as filterNewRecordsCore,
  buildDedupPlan as buildDedupPlanCore,
  removeDuplicateRecords as removeDuplicateRecordsCore,
  DEFAULT_DEDUP_WINDOW_MS,
  type DedupPlan,
  type DedupPlanOptions,
} from '@ewanc26/croft-click-core';
import { fetchRepoViaCARWithClient } from '../utils/car-fetch.js';
import { formatDate, formatDateRange } from '../utils/helpers.js';
import * as ui from '../utils/ui.js';
import { log } from '../utils/logger.js';
import { isCacheValid, loadCache, saveCache, getCacheInfo } from '../utils/teal-cache.js';
import { RECORD_TYPES } from '../config.js';

interface ExistingRecord {
  uri: string;
  cid: string;
  value: PlayRecord;
}

async function fetchPlayRecords(client: Client, did: string) {
  const collections = await Promise.all(
    RECORD_TYPES.map((collection) => fetchRepoViaCARWithClient(client, collection, did)),
  );
  return collections.flat();
}

/**
 * Fetch all existing play records from Teal via CAR exports for both
 * production and legacy collections. Uses com.atproto.sync.getRepo (sync
 * namespace) — separate, generous rate-limit envelope; burns zero AppView
 * write-quota points.
 */
export async function fetchExistingRecords(
  client: Client,
  _config: Config,
  forceRefresh: boolean = false
): Promise<Map<string, ExistingRecord>> {
  log.section('Checking Existing Records');
  const did = client.assertDid;

  if (!did) {
    throw new Error('No authenticated session found');
  }

  // Serve from cache when valid and not forcing a refresh
  if (!forceRefresh && isCacheValid(did)) {
    const cacheInfo = getCacheInfo(did);
    log.info(`📂 Loading from cache (${cacheInfo.age!.toFixed(1)}h old, ${cacheInfo.records!.toLocaleString()} records)...`);
    const cached = loadCache(did);
    if (cached) {
      const existingRecords = new Map<string, ExistingRecord>();
      for (const [, record] of cached.entries()) {
        const playRecord = record.value as PlayRecord;
        // Canonical key so cached records (which may carry old-format
        // timestamps like `11:39:14Z`) still match incoming ones (Bug 1 & 5).
        existingRecords.set(recordKeyCore(playRecord), record as ExistingRecord);
      }
      log.success(`✓ Loaded ${existingRecords.size.toLocaleString()} records from cache`);
      log.blank();
      return existingRecords;
    }
  }

  if (forceRefresh) {
    log.info('🔄 Force refresh — fetching repo via CAR export...');
  } else {
    log.info('📦 Fetching repo via CAR export (no rate-limit points consumed)...');
  }

  const carStart = Date.now();
  const carRecords = await fetchPlayRecords(client, did);
  const carElapsed = ((Date.now() - carStart) / 1000).toFixed(1);

  const existingRecords = new Map<string, ExistingRecord>();
  const cacheMap = new Map<string, { uri: string; cid: string; value: any }>();

  for (const rec of carRecords) {
    const playRecord = rec.value as PlayRecord;
    const entry = { uri: rec.uri, cid: rec.cid, value: playRecord };
    // CANONICAL KEY: normalises casing/Unicode and the timestamp, so a record
    // cached under `11:39:14Z` collides with one submitted as `11:39:14.000Z`.
    existingRecords.set(recordKeyCore(playRecord), entry);
    cacheMap.set(rec.uri, entry);
  }

  log.success(`✓ Loaded ${existingRecords.size.toLocaleString()} records via CAR in ${carElapsed}s`);
  saveCache(did, cacheMap);
  log.blank();
  return existingRecords;
}

/**
 * Fetch ALL existing play records as an array (including duplicates) via CAR
 * exports, for the deduplicate flow.
 */
export async function fetchAllRecords(
  client: Client,
  _config: Config
): Promise<ExistingRecord[]> {
  const did = client.assertDid;

  if (!did) {
    throw new Error('No authenticated session found');
  }

  ui.startSpinner('📦 Fetching repo via CAR export...');

  const carRecords = await fetchPlayRecords(client, did);
  const allRecords: ExistingRecord[] = carRecords.map((rec: { uri: string; cid: string; value: any }) => ({
    uri: rec.uri,
    cid: rec.cid,
    value: rec.value as PlayRecord,
  }));

  ui.succeedSpinner(`Found ${allRecords.length.toLocaleString()} records via CAR`);
  return allRecords;
}

/**
 * Create a unique key for a play record.
 *
 * Delegates to the shared key in `@ewanc26/croft-click-core` so the CLI and
 * web front-end can never diverge on what counts as "the same listen": it is
 * the normalised (case-/punctuation-/Unicode-insensitive) artist, normalised
 * track, and a canonicalised timestamp.
 */
export function createRecordKey(record: PlayRecord): string {
  return recordKeyCore(record);
}

/**
 * Deduplicate input records before submission.
 *
 * Delegates to the shared implementation, which keeps the first occurrence of
 * each (normalised artist, normalised track, canonical timestamp) triple — so
 * the same listen submitted as `14Z` and `14.000Z` collapses to one.
 */
export function deduplicateInputRecords(
  records: PlayRecord[]
): { unique: PlayRecord[]; duplicates: number } {
  const seen = new Map<string, PlayRecord>();
  let duplicates = 0;

  for (const record of records) {
    const key = recordKeyCore(record);
    if (!seen.has(key)) {
      seen.set(key, record);
    } else {
      duplicates++;
    }
  }

  return { unique: Array.from(seen.values()), duplicates };
}

/**
 * Filter out records that already exist in Teal.
 *
 * Wraps the shared core filter, which drops a record on an exact canonical key
 * match OR within a ±60-second window of an existing copy of the same
 * normalized artist + track (catching cross-source overlaps and same-source
 * double-fires — Bug 2).
 */
export function filterNewRecords(
  lastfmRecords: PlayRecord[],
  existingRecords: Map<string, ExistingRecord>,
  opts?: { windowMs?: number }
): PlayRecord[] {
  log.section('Identifying New Records');

  const newRecords = filterNewRecordsCore(lastfmRecords, existingRecords, {
    windowMs: opts?.windowMs ?? DEFAULT_DEDUP_WINDOW_MS,
  });
  const newRecordSet = new Set(newRecords);
  const duplicates = lastfmRecords.filter((record) => !newRecordSet.has(record));

  log.info(`Total: ${lastfmRecords.length.toLocaleString()} records`);
  log.info(`Existing: ${duplicates.length.toLocaleString()} already in Teal`);
  log.info(`New: ${newRecords.length.toLocaleString()} to import`);
  log.blank();

  if (log.getLevel() <= 0 && duplicates.length > 0) {
    const exampleCount = Math.min(3, duplicates.length);
    log.debug('Examples of existing records (skipped):');
    duplicates.slice(0, exampleCount).forEach((record, i) => {
      log.debug(`  ${i + 1}. ${record.artists?.[0]?.artistName} - ${record.trackName}`);
      log.debug(`     ${formatDate(record.playedTime, true)}`);
    });
    if (duplicates.length > exampleCount) {
      log.debug(`  ... and ${(duplicates.length - exampleCount).toLocaleString()} more`);
    }
    log.blank();
  }

  return newRecords;
}

/**
 * Get time range of records.
 */
export function getRecordTimeRange(records: PlayRecord[]): { earliest: Date; latest: Date } | null {
  if (records.length === 0) return null;
  const times = records.map(r => new Date(r.playedTime).getTime());
  return {
    earliest: new Date(Math.min(...times)),
    latest: new Date(Math.max(...times)),
  };
}

/**
 * Display sync statistics.
 */
export function displaySyncStats(
  lastfmRecords: PlayRecord[],
  existingRecords: Map<string, ExistingRecord>,
  newRecords: PlayRecord[]
): void {
  const lastfmRange = getRecordTimeRange(lastfmRecords);
  const existingArray = Array.from(existingRecords.values()).map(r => r.value);
  const existingRange = getRecordTimeRange(existingArray);

  log.section('Sync Statistics');
  log.info(`Last.fm export: ${lastfmRecords.length.toLocaleString()} records`);
  if (lastfmRange) {
    log.info(`  Range: ${formatDateRange(lastfmRange.earliest, lastfmRange.latest)}`);
  }
  log.blank();

  log.info(`Teal current: ${existingRecords.size.toLocaleString()} records`);
  if (existingRange) {
    log.info(`  Range: ${formatDateRange(existingRange.earliest, existingRange.latest)}`);
  }
  log.blank();

  log.info(`New to import: ${newRecords.length.toLocaleString()}`);
  log.info(`Duplicates: ${(lastfmRecords.length - newRecords.length).toLocaleString()} skipped`);
  log.info(`Match rate: ${((1 - newRecords.length / lastfmRecords.length) * 100).toFixed(1)}%`);
  log.blank();
}

/**
 * Fetch all records and build a deduplication plan — read-only, safe to run.
 *
 * Mirrors the polish flow: analyse first (`analyzeDuplicates` -> `displayDedupPlan`
 * -> confirm), only then execute (`removeDuplicateRecords`). The plan groups
 * records by normalized artist+track, clusters them within the ±60s window, and
 * designates the richer record (MBIDs, ISRC, duration) as the one to keep.
 */
export async function analyzeDuplicates(
  client: Client,
  config: Config,
  opts?: DedupPlanOptions
): Promise<DedupPlan> {
  const allRecords = await fetchAllRecords(client, config);
  return buildDedupPlanCore(allRecords, opts);
}

/**
 * Render a deduplication plan for review before any deletion.
 */
export function displayDedupPlan(plan: DedupPlan): void {
  ui.subheader('Duplicate groups found');

  const exampleCount = Math.min(5, plan.groups.length);
  for (let i = 0; i < exampleCount; i++) {
    const group = plan.groups[i]!;
    const kept = group.keep.value;
    log.info(
      `  ${i + 1}. ${kept.artists?.[0]?.artistName ?? '(no artist)'} - ${kept.trackName}` +
        ` @ ${formatDate(kept.playedTime, true)} — keeping` +
        ` · dropping ${group.remove.length} (${group.reason})`
    );
  }
  if (plan.groups.length > exampleCount) {
    log.info(`     ... and ${plan.groups.length - exampleCount} more group(s)`);
  }
  log.blank();

  log.info(`Total records scanned: ${plan.totalRecords.toLocaleString()}`);
  log.warn(`Duplicates to remove: ${plan.totalDuplicates.toLocaleString()} (keeping ${plan.groups.length.toLocaleString()} unique)`);
  log.blank();
}

/** Re-export the shared executor so the CLI and web delete through one path. */
export { removeDuplicateRecordsCore as removeDuplicateRecords };
export type { DedupPlan };
