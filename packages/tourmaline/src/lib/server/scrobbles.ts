import { TEAL_LEXICON, TEAL_LEGACY_LEXICON } from "@ewanc26/utils";
import { fetchRepoCollectionsViaCAR } from "@ewanc26/croft-click-core";
import type { TealScrobble } from "$lib/types";

const TEAL_LEXICONS = [TEAL_LEGACY_LEXICON, TEAL_LEXICON] as const;
const CAR_FETCH_TIMEOUT_MS = 55_000;

/**
 * Safely parse a playedTime value from an ATProto record.
 *
 * The TEAL_LEXICON lexicon marks playedTime as optional, so it may
 * be absent (undefined) in some records. Some older clients also stored it as
 * a numeric Unix timestamp instead of an ISO 8601 string. Both cases need to
 * be handled without throwing — an empty string is returned as a sentinel that
 * the Aggregator's isNaN guard will discard rather than process.
 */
function parsePlayedTime(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" && isFinite(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      try {
        return d.toISOString();
      } catch {
        // Date is out of the valid ECMAScript range — fall through to sentinel
      }
    }
  }
  // Missing or unparseable — return a sentinel the aggregator will skip
  return "";
}

/** Record fields are untrusted: coerce rather than cast. */
function str(v: unknown, max = 512): string | undefined {
  return typeof v === "string" && v.length > 0 ? v.slice(0, max) : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && isFinite(v) && v >= 0 ? v : undefined;
}

function serviceDomain(v: unknown): string | undefined {
  const raw = str(v, 2048);
  if (!raw) return undefined;

  try {
    return new URL(raw).hostname || raw;
  } catch {
    return raw;
  }
}

/**
 * Compare a legacy/stable rkey collision without retaining a JSON copy of
 * every record in memory. The namespace migration only changes $type, so
 * normalise that field before comparing the two values.
 */
function sameMigratedRecordValue(a: unknown, b: unknown): boolean {
  const normalise = (value: unknown): unknown =>
    value && typeof value === "object"
      ? {
          ...(value as Record<string, unknown>),
          $type: TEAL_LEXICON,
        }
      : value;

  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

function parseScrobble(v: Record<string, unknown>): TealScrobble {
  const rawArtists = Array.isArray(v.artists) ? v.artists : [];

  return {
    trackName: str(v.trackName) ?? "",
    artists: rawArtists
      .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
      .map((a) => ({
        name: str(a.artistName) ?? str(a.name) ?? "",
        mbId: str(a.artistMbId, 64) ?? str(a.mbId, 64),
      }))
      .filter((a) => a.name.length > 0),
    releaseName: str(v.releaseName),
    trackMbId: str(v.trackMbId, 64),
    recordingMbId: str(v.recordingMbId, 64),
    releaseMbId: str(v.releaseMbId, 64),
    duration: num(v.duration),
    originUrl: str(v.originUri, 2048) ?? str(v.originUrl, 2048),
    playedTime: parsePlayedTime(v.playedTime),
    submissionClientAgent: str(v.submissionClientAgent, 256),
    musicServiceBaseDomain:
      serviceDomain(v.musicServiceUri) ??
      serviceDomain(v.musicServiceBaseDomain),
    trackDiscriminant: str(v.trackDiscriminant),
    releaseDiscriminant: str(v.releaseDiscriminant),
  };
}

export interface ScrobbleBatchResult {
  scrobbles: TealScrobble[];
  cursor: string | null;
  done: boolean;
}

interface ListRecordsResponse {
  records?: Array<{ uri: string; cid: string; value: unknown }>;
  cursor?: string;
}

interface FallbackCursor {
  collection: number;
  cursor: string | null;
}

const FALLBACK_CURSOR_PREFIX = "fallback:";

function encodeFallbackCursor(cursor: FallbackCursor): string {
  return `${FALLBACK_CURSOR_PREFIX}${Buffer.from(JSON.stringify(cursor)).toString("base64url")}`;
}

function decodeFallbackCursor(cursor: string | null): FallbackCursor | null {
  if (!cursor?.startsWith(FALLBACK_CURSOR_PREFIX)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(
        cursor.slice(FALLBACK_CURSOR_PREFIX.length),
        "base64url",
      ).toString(),
    ) as Partial<FallbackCursor>;
    const collection = parsed.collection;
    if (
      typeof collection !== "number" ||
      !Number.isInteger(collection) ||
      collection < 0 ||
      collection >= TEAL_LEXICONS.length ||
      (parsed.cursor !== null && typeof parsed.cursor !== "string")
    ) {
      return null;
    }
    return { collection, cursor: parsed.cursor ?? null };
  } catch {
    return null;
  }
}

/** Fetch one bounded listRecords page when a PDS cannot produce a CAR export. */
async function fetchFallbackPage(
  pdsUrl: string,
  did: string,
  state: FallbackCursor,
): Promise<ScrobbleBatchResult> {
  const collection = TEAL_LEXICONS[state.collection];
  const params = new URLSearchParams({ repo: did, collection, limit: "100" });
  if (state.cursor) params.set("cursor", state.cursor);

  const response = await fetch(
    `${pdsUrl.replace(/\/$/, "")}/xrpc/com.atproto.repo.listRecords?${params}`,
  );
  if (!response.ok) throw new Error(`listRecords failed: ${response.status}`);

  const data = (await response.json()) as ListRecordsResponse;
  const records = Array.isArray(data.records) ? data.records : [];
  const source: "legacy" | "stable" =
    state.collection === 0 ? "legacy" : "stable";
  const scrobbles = records.flatMap((record) => {
    if (!record?.value || typeof record.value !== "object") return [];
    return [
      {
        ...parseScrobble(record.value as Record<string, unknown>),
        _tourmalineRecordKey: record.uri.split("/").pop() ?? "",
        _tourmalineCollection: source,
      },
    ];
  });

  const nextPageCursor = typeof data.cursor === "string" ? data.cursor : null;
  if (nextPageCursor && records.length > 0) {
    return {
      scrobbles,
      cursor: encodeFallbackCursor({
        collection: state.collection,
        cursor: nextPageCursor,
      }),
      done: false,
    };
  }

  const nextCollection = state.collection + 1;
  if (nextCollection < TEAL_LEXICONS.length) {
    return {
      scrobbles,
      cursor: encodeFallbackCursor({
        collection: nextCollection,
        cursor: null,
      }),
      done: false,
    };
  }

  return { scrobbles, cursor: null, done: true };
}

/**
 * Fetch both Teal play collections from one CAR export
 * (`com.atproto.sync.getRepo`) and parse the records locally. Identical
 * alpha/stable records are counted once, preferring the stable collection.
 *
 * getRepo always returns the whole repository, regardless of which collection
 * Tourmaline wants. Fetching each Teal namespace separately therefore doubled
 * the CAR body, parser index, and MST traversal in memory. Large listening
 * repos can exceed a serverless function's memory limit that way, so both
 * namespaces are extracted during one download and one walk.
 *
 * Deduplication also avoids storing a JSON serialisation of every record as a
 * Map key. Record values are only compared when the same rkey exists in both
 * namespaces, preserving the previous migration-deduplication semantics with a
 * much smaller memory footprint.
 *
 * Successful CAR responses are one-shot. If the export is unavailable, the
 * function instead returns bounded `listRecords` pages with an opaque cursor.
 */
export async function fetchScrobbleBatch(
  pdsUrl: string,
  did: string,
  cursor: string | null = null,
): Promise<ScrobbleBatchResult> {
  const fallbackCursor = decodeFallbackCursor(cursor);
  if (fallbackCursor) return fetchFallbackPage(pdsUrl, did, fallbackCursor);

  let recordsByCollection: Map<string, Awaited<ReturnType<typeof fetchRepoCollectionsViaCAR>> extends Map<string, infer T> ? T : never>;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CAR_FETCH_TIMEOUT_MS);
    try {
      recordsByCollection = await fetchRepoCollectionsViaCAR(pdsUrl, did, TEAL_LEXICONS, controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    // Some PDSes have very large repos and cannot produce a complete CAR
    // within a serverless request. Fall back to the bounded public records
    // endpoint so those users still get a usable profile.
    console.warn("[tourmaline] CAR export unavailable; falling back to listRecords", error);
    return fetchFallbackPage(pdsUrl, did, { collection: 0, cursor: null });
  }

  const legacyRecords = recordsByCollection.get(TEAL_LEGACY_LEXICON) ?? [];
  const stableRecords = recordsByCollection.get(TEAL_LEXICON) ?? [];

  // rkeys are unique within a collection. Keep only the stable lookup needed
  // to detect namespace-migration duplicates rather than a second map keyed by
  // `${rkey}:${JSON.stringify(record)}` for the entire listening history.
  const stableByRkey = new Map(stableRecords.map((record) => [record.rkey, record]));
  const consumedStableRkeys = new Set<string>();
  const scrobbles: TealScrobble[] = [];

  const append = (record: (typeof stableRecords)[number]): void => {
    const value = record.value;
    if (value && typeof value === "object") {
      scrobbles.push(parseScrobble(value as Record<string, unknown>));
    }
  };

  // Preserve the old ordering: legacy records appear first, but an identical
  // stable migration replaces the legacy value at that position.
  for (const legacyRecord of legacyRecords) {
    const stableRecord = stableByRkey.get(legacyRecord.rkey);
    if (
      stableRecord &&
      sameMigratedRecordValue(legacyRecord.value, stableRecord.value)
    ) {
      append(stableRecord);
      consumedStableRkeys.add(stableRecord.rkey);
    } else {
      append(legacyRecord);
    }
  }

  // Stable records that were not exact migrated duplicates retain their place
  // after the legacy collection, matching the previous Map insertion order.
  for (const stableRecord of stableRecords) {
    if (!consumedStableRkeys.has(stableRecord.rkey)) {
      append(stableRecord);
    }
  }

  return { scrobbles, cursor: null, done: true };
}
