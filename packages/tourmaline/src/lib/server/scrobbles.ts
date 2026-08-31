import { TEAL_LEXICON, TEAL_LEGACY_LEXICON } from "@ewanc26/utils";
import { iterateRepoCollectionsViaCAR } from "@ewanc26/croft-click-core";
import type { TealScrobble } from "$lib/types";

const TEAL_LEXICONS = [TEAL_LEGACY_LEXICON, TEAL_LEXICON] as const;
const CAR_FETCH_TIMEOUT_MS = 55_000;
const STREAM_BATCH_SIZE = 250;

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
    musicServiceBaseDomain: serviceDomain(v.musicServiceUri) ?? serviceDomain(v.musicServiceBaseDomain),
    trackDiscriminant: str(v.trackDiscriminant),
    releaseDiscriminant: str(v.releaseDiscriminant),
  };
}

export type ScrobbleStreamEvent =
  | {
      type: "scrobbles";
      collection: "legacy" | "stable";
      rkeys: string[];
      scrobbles: TealScrobble[];
    }
  | { type: "complete"; cursor: string | null; done: boolean };

interface ScrobbleBatchResult {
  scrobbles: TealScrobble[];
  rkeys: string[];
  collection: "legacy" | "stable";
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
      Buffer.from(cursor.slice(FALLBACK_CURSOR_PREFIX.length), "base64url").toString(),
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
async function fetchFallbackPage(pdsUrl: string, did: string, state: FallbackCursor): Promise<ScrobbleBatchResult> {
  const collection = TEAL_LEXICONS[state.collection];
  const params = new URLSearchParams({ repo: did, collection, limit: "100" });
  if (state.cursor) params.set("cursor", state.cursor);

  const response = await fetch(`${pdsUrl.replace(/\/$/, "")}/xrpc/com.atproto.repo.listRecords?${params}`);
  if (!response.ok) throw new Error(`listRecords failed: ${response.status}`);

  const data = (await response.json()) as ListRecordsResponse;
  const records = Array.isArray(data.records) ? data.records : [];
  const source: "legacy" | "stable" = state.collection === 0 ? "legacy" : "stable";
  const scrobbles: TealScrobble[] = [];
  const rkeys: string[] = [];
  for (const record of records) {
    if (!record?.value || typeof record.value !== "object") continue;
    scrobbles.push(parseScrobble(record.value as Record<string, unknown>));
    rkeys.push(record.uri.split("/").pop() ?? "");
  }

  const nextPageCursor = typeof data.cursor === "string" ? data.cursor : null;
  if (nextPageCursor && records.length > 0) {
    return {
      scrobbles,
      rkeys,
      collection: source,
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
      rkeys,
      collection: source,
      cursor: encodeFallbackCursor({
        collection: nextCollection,
        cursor: null,
      }),
      done: false,
    };
  }

  return {
    scrobbles,
    rkeys,
    collection: source,
    cursor: null,
    done: true,
  };
}

/**
 * Fetch both Teal play collections from one CAR export
 * (`com.atproto.sync.getRepo`) and parse the records locally.
 *
 * getRepo always returns the whole repository, regardless of which collection
 * Tourmaline wants. Fetching each Teal namespace separately therefore doubled
 * the CAR body, parser index, and MST traversal in memory. Large listening
 * repos can exceed a serverless function's memory limit that way, so both
 * namespaces are extracted during one download and one walk.
 *
 * Collection/rkey metadata travels with each record so the browser can collapse
 * exact legacy/stable migration duplicates after the complete stream arrives.
 *
 * Successful CAR responses are emitted in bounded batches so the API route can
 * forward them without retaining or serialising one enormous response object.
 * If the export is unavailable, the function emits one bounded `listRecords`
 * page and an opaque cursor for the next browser request.
 */
export async function* streamScrobbleBatch(
  pdsUrl: string,
  did: string,
  cursor: string | null = null,
): AsyncGenerator<ScrobbleStreamEvent> {
  const fallbackCursor = decodeFallbackCursor(cursor);
  if (fallbackCursor) {
    const result = await fetchFallbackPage(pdsUrl, did, fallbackCursor);
    if (result.scrobbles.length > 0) {
      yield {
        type: "scrobbles",
        collection: result.collection,
        rkeys: result.rkeys,
        scrobbles: result.scrobbles,
      };
    }
    yield { type: "complete", cursor: result.cursor, done: result.done };
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CAR_FETCH_TIMEOUT_MS);
  let emitted = false;
  try {
    let batch: TealScrobble[] = [];
    let rkeys: string[] = [];
    let batchCollection: "legacy" | "stable" | null = null;
    for await (const { collection, record } of iterateRepoCollectionsViaCAR(
      pdsUrl,
      did,
      TEAL_LEXICONS,
      controller.signal,
    )) {
      if (!record.value || typeof record.value !== "object") continue;

      const source = collection === TEAL_LEGACY_LEXICON ? "legacy" : "stable";
      if (batch.length > 0 && source !== batchCollection) {
        emitted = true;
        yield {
          type: "scrobbles",
          collection: batchCollection!,
          rkeys,
          scrobbles: batch,
        };
        batch = [];
        rkeys = [];
      }
      batchCollection = source;

      batch.push(parseScrobble(record.value as Record<string, unknown>));
      rkeys.push(record.rkey);

      if (batch.length >= STREAM_BATCH_SIZE) {
        emitted = true;
        yield {
          type: "scrobbles",
          collection: batchCollection,
          rkeys,
          scrobbles: batch,
        };
        batch = [];
        rkeys = [];
      }
    }

    if (batch.length > 0 && batchCollection) {
      emitted = true;
      yield {
        type: "scrobbles",
        collection: batchCollection,
        rkeys,
        scrobbles: batch,
      };
    }
    yield { type: "complete", cursor: null, done: true };
    return;
  } catch (error) {
    if (emitted) throw error;

    // Some PDSes have very large repos and cannot produce a complete CAR
    // within a serverless request. Fall back to the bounded public records
    // endpoint so those users still get a usable profile.
    console.warn("[tourmaline] CAR export unavailable; falling back to listRecords", error);
    const result = await fetchFallbackPage(pdsUrl, did, {
      collection: 0,
      cursor: null,
    });
    if (result.scrobbles.length > 0) {
      yield {
        type: "scrobbles",
        collection: result.collection,
        rkeys: result.rkeys,
        scrobbles: result.scrobbles,
      };
    }
    yield { type: "complete", cursor: result.cursor, done: result.done };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
