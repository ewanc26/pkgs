import { TEAL_LEXICON } from "@ewanc26/utils";
import type { TealScrobble } from "$lib/types";
import { pdsRateLimiter, isRateLimitError } from "./rate-limit";

interface ListRecordsResponse {
  records: Array<{
    uri: string;
    cid: string;
    value: Record<string, unknown>;
  }>;
  cursor?: string;
}

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
    originUrl: str(v.originUrl, 2048),
    playedTime: parsePlayedTime(v.playedTime),
    submissionClientAgent: str(v.submissionClientAgent, 256),
    musicServiceBaseDomain: str(v.musicServiceBaseDomain, 253),
    trackDiscriminant: str(v.trackDiscriminant),
    releaseDiscriminant: str(v.releaseDiscriminant),
  };
}

export interface ScrobbleBatchResult {
  scrobbles: TealScrobble[];
  cursor: string | null;
  done: boolean;
}

/**
 * Fetch a batch of scrobbles from the PDS.
 * Each call fetches up to `maxPages` pages (default 25, ~2500 scrobbles)
 * to stay well under the Vercel Hobby 10s timeout.
 */
export async function fetchScrobbleBatch(
  pdsUrl: string,
  did: string,
  cursor: string | null,
  maxPages = 25,
): Promise<ScrobbleBatchResult> {
  const limit = 100;
  let currentCursor = cursor;
  const batch: TealScrobble[] = [];

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      repo: did,
      collection: TEAL_LEXICON,
      limit: String(limit),
    });
    if (currentCursor) params.set("cursor", currentCursor);

    const url = `${pdsUrl}/xrpc/com.atproto.repo.listRecords?${params}`;

    // Wait for rate limit permit
    await pdsRateLimiter.waitForPermit(1);

    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      if (isRateLimitError(res.status, body)) {
        pdsRateLimiter.handleRateLimitHit(res.headers);
        throw new Error("Rate limit exceeded. Try again in a minute.");
      }
      // The upstream body is logged but never propagated to the browser.
      console.error(
        `[tourmaline] listRecords ${res.status} from ${pdsUrl}: ${body.slice(0, 500)}`,
      );
      throw new Error(`listRecords failed: ${res.status}`);
    }

    // Update rate limiter stats
    pdsRateLimiter.updateFromHeaders(res.headers);

    const data = (await res.json()) as Partial<ListRecordsResponse>;

    // Remote responses are untrusted: a PDS may omit or mistype `records`.
    const records = Array.isArray(data.records) ? data.records : [];
    for (const record of records) {
      if (record && typeof record.value === "object" && record.value !== null) {
        batch.push(parseScrobble(record.value));
      }
    }

    currentCursor = typeof data.cursor === "string" ? data.cursor : null;
    if (!currentCursor || records.length === 0) {
      return { scrobbles: batch, cursor: null, done: true };
    }
  }

  return { scrobbles: batch, cursor: currentCursor, done: false };
}
