import { TEAL_LEXICON } from "@ewanc26/utils";
import { fetchRepoViaCAR } from "@ewanc26/croft-click-core";
import type { TealScrobble } from "$lib/types";

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
 * Fetch a user's entire `fm.teal.alpha.feed.play` collection via the CAR
 * export (`com.atproto.sync.getRepo`) and parse the records locally.
 *
 * Replaces the previous listRecords pagination, which needed up to 25
 * AppView-ratelimited requests per 2,500 records and looped until done. The
 * sync namespace has its own far more generous envelope, so one request
 * downloads the whole repo and the records are extracted with Malachite's CAR
 * MST walker. The response is intentionally one-shot: `cursor` is always null
 * and `done` always true, so the client loop exits after a single call.
 */
export async function fetchScrobbleBatch(
  pdsUrl: string,
  did: string,
): Promise<ScrobbleBatchResult> {
  const records = await fetchRepoViaCAR(pdsUrl, did, TEAL_LEXICON);

  const scrobbles: TealScrobble[] = [];
  for (const record of records) {
    const value = record.value;
    if (value && typeof value === "object") {
      scrobbles.push(parseScrobble(value as Record<string, unknown>));
    }
  }

  return { scrobbles, cursor: null, done: true };
}
