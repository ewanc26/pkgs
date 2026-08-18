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

export interface ExistingRecord {
  uri: string;
  cid: string;
  value: PlayRecord;
}

export interface DedupGroup {
  key: string;
  records: ExistingRecord[];
}

export function recordKey(r: PlayRecord): string {
  const artist = (r.artists[0]?.artistName ?? '').toLowerCase().trim();
  return `${artist}|||${r.trackName.toLowerCase().trim()}|||${r.playedTime}`;
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

export function filterNewRecords(
  records: PlayRecord[],
  existing: Map<string, ExistingRecord>
): PlayRecord[] {
  return records.filter((r) => !existing.has(recordKey(r)));
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

export async function removeDuplicateRecords(
  client: Client,
  groups: DedupGroup[],
  onProgress?: (removed: number) => void,
  signal?: AbortSignal
): Promise<number> {
  let removed = 0;
  for (const group of groups) {
    for (const rec of group.records.slice(1)) {
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
