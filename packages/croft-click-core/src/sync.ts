/**
 * Sync helpers — environment-agnostic.
 * Fetches existing records via CAR export and provides filter / dedup logic.
 * No CLI UI or caching; those are added by the CLI wrapper in src/lib/sync.ts.
 */

import type { Client } from '@atproto/lex'
import type { PlayRecord } from './types.js'
import { RECORD_TYPES } from './config.js'
import { fetchRepoViaCARWithClient } from './car-fetch.js'
import { com } from '@bsky/sdk/lexicons'
import {
  playRecordKey,
  trackTimeKey,
  normalizeString,
  epochMillis,
} from './normalize.js'
import {
  toNorm,
  sourceOf,
  betterRecord,
} from './merge.js'

export interface ExistingRecord {
  uri: string;
  cid: string;
  value: PlayRecord;
}

export interface DedupGroup {
  key: string;
  records: ExistingRecord[];
}

/**
 * A single dedup decision for one cluster of near-identical records.
 *
 * `keep` is the record with the richest metadata (MusicBrainz IDs, ISRC,
 * duration, Spotify/Apple provenance); `remove` are the lesser copies slated for
 * deletion. `reason` is a short human-readable explanation surfaced in the plan
 * review.
 */
export interface DedupPlanGroup {
  key: string;
  keep: ExistingRecord;
  remove: ExistingRecord[];
  reason: string;
}

export interface DedupPlan {
  groups: DedupPlanGroup[];
  totalDuplicates: number;
  totalRecords: number;
}

export interface DedupPlanOptions {
  /** Window in ms within which same artist+track is one listen (default 60_000). */
  windowMs?: number;
}

/** The default sync/dedup tolerance for "same listen" — see Bug 2. */
export const DEFAULT_DEDUP_WINDOW_MS = 60_000;

export function recordKey(r: PlayRecord): string {
  return playRecordKey(r);
}

/** In-session memory cache — avoids re-fetching within the same process/page. */
const sessionCache = new Map<string, Map<string, ExistingRecord>>();

async function fetchPlayRecords(
  client: Client,
  did: string,
  signal: AbortSignal | undefined,
) {
  const collections = await Promise.all(
    RECORD_TYPES.map((collection) => fetchRepoViaCARWithClient(client, collection, did, signal)),
  );
  return collections.flat();
}

function collectionFromUri(uri: string): string {
  return uri.split('/').slice(3, -1).join('/');
}

/** Extract DID from a Client. */
function getDid(client: Client): string {
  return client.assertDid
}

export async function fetchExistingRecords(
  client: Client,
  onProgress?: (fetched: number) => void,
  forceRefresh = false,
  signal?: AbortSignal
): Promise<Map<string, ExistingRecord>> {
  const did = getDid(client);
  if (!did) throw new Error('No authenticated session');

  if (!forceRefresh && sessionCache.has(did)) {
    return sessionCache.get(did)!;
  }

  signal?.throwIfAborted();

  // The session's own fetch handler resolves the PDS origin and refreshes
  // expired credentials before retrying, so there is no token dance to do here.
  let carRecords: Awaited<ReturnType<typeof fetchPlayRecords>>;
  try {
    carRecords = await fetchPlayRecords(client, did, signal);
  } catch (err) {
    sessionCache.delete(did);
    throw err;
  }

  const map = new Map<string, ExistingRecord>();
  for (const rec of carRecords) {
    const value = rec.value as unknown as PlayRecord;
    map.set(recordKey(value), { uri: rec.uri, cid: rec.cid, value });
  }

  onProgress?.(map.size);
  sessionCache.set(did, map);
  return map;
}

/**
 * Index existing records by normalised artist|track and per-minute bucket so the
 * sync filter can cheaply scan neighbouring minute buckets for the ±windowMs
 * match (Bug 2). Records without an artist still bucket under an empty artist
 * key so they can be matched by title + time alone.
 */
function buildWindowIndex(
  existing: Map<string, ExistingRecord>,
): Map<string, Map<number, ExistingRecord[]>> {
  const index = new Map<string, Map<number, ExistingRecord[]>>();
  for (const rec of existing.values()) {
    const artist = normalizeString(rec.value.artists?.[0]?.artistName ?? '');
    const track = normalizeString(rec.value.trackName);
    const bucket = Math.floor(epochMillis(rec.value) / 60_000);
    const nk = `${artist}|||${track}`;
    let minuteMap = index.get(nk);
    if (!minuteMap) {
      minuteMap = new Map();
      index.set(nk, minuteMap);
    }
    let arr = minuteMap.get(bucket);
    if (!arr) {
      arr = [];
      minuteMap.set(bucket, arr);
    }
    arr.push(rec);
  }
  return index;
}

/**
 * True when a record is the same listen as an existing one within the time
 * window — same normalised artist + track and timestamps within ±windowMs.
 */
function matchesWithinWindow(
  record: PlayRecord,
  index: Map<string, Map<number, ExistingRecord[]>>,
  windowMs: number,
): boolean {
  const artist = normalizeString(record.artists?.[0]?.artistName ?? '');
  const track = normalizeString(record.trackName);
  const nk = `${artist}|||${track}`;
  const minuteMap = index.get(nk);
  if (!minuteMap || minuteMap.size === 0) return false;

  const bucket = Math.floor(epochMillis(record) / 60_000);
  const recordTs = epochMillis(record);
  for (const b of [bucket - 1, bucket, bucket + 1]) {
    const arr = minuteMap.get(b);
    if (!arr) continue;
    for (const candidate of arr) {
      if (Math.abs(epochMillis(candidate.value) - recordTs) <= windowMs) return true;
    }
  }
  return false;
}

/**
 * Filter out records that already exist in Teal.
 *
 * A new record is dropped when any of the following hold:
 *  1. An exact canonical key (normalised artist + track + canonical timestamp)
 *     already exists — the same instant regardless of how the timestamp string
 *     was serialised by the submitting client (Bug 1).
 *  2. A record with the same normalised artist + track was played within ±60s
 *     (configurable) — catches the cross-source pattern where a Last.fm scrobble
 *     and a Spotify stream-start land a few seconds apart, and same-source
 *     double-fires (Bug 2). The window is deliberately 60s, not 5 minutes: a
 *     genuine deliberate replay of a short track within a longer window is real
 *     behaviour worth preserving.
 *  3. The legacy artist-missing fallback: when the incoming row carries no artist
 *     but an existing copy of the same title at the same instant does, it is the
 *     same event. When both sides have artists and they disagree, the incoming
 *     record is preserved rather than collapsed, since the title may be shared.
 *
 * @param windowMs  Same-listen tolerance in milliseconds (default 60_000).
 */
export function filterNewRecords(
  records: PlayRecord[],
  existing: Map<string, ExistingRecord>,
  opts?: { windowMs?: number }
): PlayRecord[] {
  const windowMs = opts?.windowMs ?? DEFAULT_DEDUP_WINDOW_MS;
  const windowIndex = buildWindowIndex(existing);

  const byTrackTime = new Map<string, ExistingRecord[]>();
  for (const existingRecord of existing.values()) {
    const key = trackTimeKey(existingRecord.value);
    const group = byTrackTime.get(key);
    if (group) group.push(existingRecord);
    else byTrackTime.set(key, [existingRecord]);
  }

  return records.filter((record) => {
    if (existing.has(recordKey(record))) return false;
    if (matchesWithinWindow(record, windowIndex, windowMs)) return false;

    const candidates = byTrackTime.get(trackTimeKey(record));
    if (!candidates?.length) return true;

    const artist = normalizeString(record.artists?.[0]?.artistName ?? '');
    if (!artist) return false;

    // If the incoming row has an artist but an existing copy does not, it is
    // still the same event. When both artists are known and differ, preserve it.
    return !candidates.some((candidate) => {
      const candidateArtist = normalizeString(candidate.value.artists?.[0]?.artistName ?? '');
      return !candidateArtist;
    });
  });
}

export async function fetchAllRecordsForDedup(
  client: Client,
  onProgress?: (fetched: number) => void,
  signal?: AbortSignal
): Promise<ExistingRecord[]> {
  const did = getDid(client);
  if (!did) throw new Error('No authenticated session');

  signal?.throwIfAborted();

  const carRecords = await fetchPlayRecords(client, did, signal);

  const all: ExistingRecord[] = carRecords.map((rec) => ({
    uri: rec.uri,
    cid: rec.cid,
    value: rec.value as unknown as PlayRecord,
  }));

  onProgress?.(all.length);
  return all;
}

export function findDuplicateGroups(records: ExistingRecord[]): DedupGroup[] {
  const groups = new Map<string, ExistingRecord[]>();
  for (const rec of records) {
    const key = recordKey(rec.value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rec);
  }
  const result: DedupGroup[] = [];
  for (const [key, recs] of groups) {
    if (recs.length > 1) result.push({ key, records: recs });
  }
  return result;
}

/**
 * Build a safe, reviewable deduplication plan for a live repo.
 *
 * Groups records by normalised artist + track, then clusters records whose
 * timestamps fall within the ±windowMs tolerance (default 60s). Within each
 * cluster the richest record is kept (MusicBrainz IDs, ISRC, duration, then
 * Spotify over Apple over others via {@link betterRecord}) and the rest are
 * marked for deletion. This catches every one of the five production duplicate
 * causes at once:
 *
 *  - timestamp format variance (`14Z` vs `14.000Z`) → 0ms gap → one cluster
 *  - cross-source ±seconds plays (Last.fm vs Spotify)
 *  - same-source double-fires 30–60s apart
 *  - case / Unicode spelling variants (`Dagames`/`DAGames`, curly vs straight
 *    apostrophes, non-breaking hyphens) → normalised to one key
 *
 * The result is read-only and dry-run safe; deletion is performed separately by
 * {@link removeDuplicateRecords}.
 */
export function buildDedupPlan(
  records: ExistingRecord[],
  opts: DedupPlanOptions = {}
): DedupPlan {
  const windowMs = opts.windowMs ?? DEFAULT_DEDUP_WINDOW_MS;

  // Group by normalised artist|track (case + punctuation + Unicode insensitive).
  const groups = new Map<string, ExistingRecord[]>();
  for (const rec of records) {
    const key = `${normalizeString(rec.value.artists?.[0]?.artistName ?? '')}|||${normalizeString(rec.value.trackName)}`;
    const g = groups.get(key);
    if (g) g.push(rec);
    else groups.set(key, [rec]);
  }

  const out: DedupPlanGroup[] = [];
  let totalDuplicates = 0;

  for (const [key, recs] of groups) {
    if (recs.length < 2) continue;
    recs.sort((a, b) => epochMillis(a.value) - epochMillis(b.value));

    // Cluster records whose timestamps are within windowMs of the previous
    // record in the run. This is the "within ±windowMs of an existing record in
    // the cluster" rule from Bug 2, applied over the existing dataset: a same-
    // instant re-import (0ms gap), a 30–60s double-fire, or a cross-source
    // overlap all collapse; a deliberate replay >60s later does not.
    let cluster: ExistingRecord[] = [recs[0]];
    for (let i = 1; i < recs.length; i++) {
      if (epochMillis(recs[i].value) - epochMillis(cluster[cluster.length - 1].value) <= windowMs) {
        cluster.push(recs[i]);
      } else {
        if (cluster.length > 1) {
          out.push(finalizeGroup(key, cluster));
          totalDuplicates += cluster.length - 1;
        }
        cluster = [recs[i]];
      }
    }
    if (cluster.length > 1) {
      out.push(finalizeGroup(key, cluster));
      totalDuplicates += cluster.length - 1;
    }
  }

  return { groups: out, totalDuplicates, totalRecords: records.length };
}

function finalizeGroup(key: string, cluster: ExistingRecord[]): DedupPlanGroup {
  const best = pickBest(cluster);
  const remove = cluster.filter((r) => r !== best);
  return {
    key,
    keep: best,
    remove,
    reason: duplicateReason(cluster, best),
  };
}

function pickBest(cluster: ExistingRecord[]): ExistingRecord {
  return cluster.slice(1).reduce(
    (best, cur) => {
      const a = toNorm(best.value, sourceOf(best.value));
      const b = toNorm(cur.value, sourceOf(cur.value));
      return betterRecord(a, b) === a.original ? best : cur;
    },
    cluster[0],
  );
}

function duplicateReason(cluster: ExistingRecord[], kept: ExistingRecord): string {
  if (cluster.length === 2) return 'exact or near-duplicate (within 60s, same artist+track)';
  return `${cluster.length - 1} near-duplicates (within 60s, same artist+track)`;
}

/**
 * Execute a deduplication plan: delete every record marked `remove`.
 *
 * Each deletion is a dedicated `com.atproto.repo.deleteRecord` call with a short
 * pacing delay, so a 100k-record repo with a few thousand duplicates is handled
 * safely without tripping write rate limits. The plan itself is built read-only
 * by {@link buildDedupPlan}; this performs only the deletions.
 */
export async function removeDuplicateRecords(
  client: Client,
  plan: DedupPlan,
  onProgress?: (removed: number) => void,
  signal?: AbortSignal
): Promise<number> {
  let removed = 0;
  for (const group of plan.groups) {
    for (const rec of group.remove) {
      signal?.throwIfAborted();
      try {
        await client.call(com.atproto.repo.deleteRecord.main as any,
          { repo: getDid(client)!, collection: collectionFromUri(rec.uri), rkey: rec.uri.split('/').pop()! },
          { signal }
        );
        removed++;
        onProgress?.(removed);
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 100);
          signal?.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason); }, { once: true });
        });
      } catch (err: unknown) {
        if (signal?.aborted) throw err;
      }
    }
  }
  return removed;
}
