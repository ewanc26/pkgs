import { TEAL_LEXICON, TEAL_LEGACY_LEXICON } from "@ewanc26/utils";
import { fetchRepoViaCAR } from "@ewanc26/croft-click-core";
import type { TealScrobble } from "$lib/types";

const TEAL_LEXICONS = [TEAL_LEGACY_LEXICON, TEAL_LEXICON] as const;

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

function deduplicationKey(record: { rkey: string; value: unknown }): string {
  const value =
    record.value && typeof record.value === "object"
      ? {
          ...(record.value as Record<string, unknown>),
          $type: TEAL_LEXICON,
        }
      : record.value;

  return `${record.rkey}:${JSON.stringify(value)}`;
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

/**
 * Fetch both Teal play collections via the CAR export
 * (`com.atproto.sync.getRepo`) and parse the records locally. Identical
 * alpha/stable records are counted once, preferring the stable collection.
 *
 * Replaces the previous listRecords pagination, which needed up to 25
 * AppView-ratelimited requests per 2,500 records and looped until done. The
 * sync namespace has its own far more generous envelope, so one request per
 * collection downloads the whole repo and the records are extracted with
 * Malachite's CAR MST walker. The response is intentionally one-shot: `cursor`
 * is always null and `done` always true, so the client loop exits after a
 * single call.
 */
export async function fetchScrobbleBatch(
  pdsUrl: string,
  did: string,
): Promise<ScrobbleBatchResult> {
  const [legacyRecords, stableRecords] = await Promise.all(
    TEAL_LEXICONS.map((collection) => fetchRepoViaCAR(pdsUrl, did, collection)),
  );
  const records = [...legacyRecords, ...stableRecords];

  const uniqueRecords = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = deduplicationKey(record);
    const previous = uniqueRecords.get(key);
    if (!previous || record.uri.includes(`/${TEAL_LEXICON}/`)) {
      uniqueRecords.set(key, record);
    }
  }

  const scrobbles: TealScrobble[] = [];
  for (const record of uniqueRecords.values()) {
    const value = record.value;
    if (value && typeof value === "object") {
      scrobbles.push(parseScrobble(value as Record<string, unknown>));
    }
  }

  return { scrobbles, cursor: null, done: true };
}
