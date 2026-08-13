import type { CARRecord } from "@ewanc26/croft-click-core";
import type { TealScrobble } from "$lib/types";

export const LEGACY_TEAL_LEXICON = "fm.teal.alpha.feed.play";
export const STABLE_TEAL_LEXICON = "fm.teal.feed.play";
export const TEAL_PLAY_COLLECTIONS = [
  LEGACY_TEAL_LEXICON,
  STABLE_TEAL_LEXICON,
] as const;

/** Safely parse the optional playedTime field from an untrusted record. */
function parsePlayedTime(value: unknown): string {
  if (typeof value === "string") return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      try {
        return date.toISOString();
      } catch {
        // Date is outside the valid ECMAScript range.
      }
    }
  }

  return "";
}

/** Record fields are untrusted: coerce strings and cap their size. */
function stringValue(value: unknown, max = 512): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, max)
    : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function serviceDomain(value: unknown): string | undefined {
  const raw = stringValue(value, 2048);
  if (!raw) return undefined;

  try {
    return new URL(raw).hostname || raw;
  } catch {
    return raw;
  }
}

/** Convert either Teal play record shape to Tourmaline's internal model. */
export function parseScrobble(value: Record<string, unknown>): TealScrobble {
  const rawArtists = Array.isArray(value.artists) ? value.artists : [];

  return {
    trackName: stringValue(value.trackName) ?? "",
    artists: rawArtists
      .filter(
        (artist): artist is Record<string, unknown> =>
          !!artist && typeof artist === "object",
      )
      .map((artist) => ({
        name: stringValue(artist.artistName) ?? stringValue(artist.name) ?? "",
        mbId:
          stringValue(artist.artistMbId, 64) ?? stringValue(artist.mbId, 64),
      }))
      .filter((artist) => artist.name.length > 0),
    releaseName: stringValue(value.releaseName),
    trackMbId: stringValue(value.trackMbId, 64),
    recordingMbId: stringValue(value.recordingMbId, 64),
    releaseMbId: stringValue(value.releaseMbId, 64),
    duration: numberValue(value.duration),
    originUrl:
      stringValue(value.originUri, 2048) ?? stringValue(value.originUrl, 2048),
    playedTime: parsePlayedTime(value.playedTime),
    submissionClientAgent: stringValue(value.submissionClientAgent, 256),
    musicServiceBaseDomain:
      serviceDomain(value.musicServiceUri) ??
      serviceDomain(value.musicServiceBaseDomain),
    trackDiscriminant: stringValue(value.trackDiscriminant),
    releaseDiscriminant: stringValue(value.releaseDiscriminant),
  };
}

/** Parse all valid object records from both CAR collection results. */
export function parseScrobbleRecords(
  records: readonly CARRecord[],
): TealScrobble[] {
  const scrobbles: TealScrobble[] = [];

  for (const record of records) {
    if (record.value && typeof record.value === "object") {
      scrobbles.push(parseScrobble(record.value as Record<string, unknown>));
    }
  }

  return scrobbles;
}

export type CARRecordFetcher = (
  pdsUrl: string,
  did: string,
  collection: string,
) => Promise<CARRecord[]>;

/** Fetch and merge the legacy and production play collections. */
export async function fetchTealPlayRecords(
  pdsUrl: string,
  did: string,
  fetcher: CARRecordFetcher,
): Promise<CARRecord[]> {
  const collections = await Promise.all(
    TEAL_PLAY_COLLECTIONS.map((collection) => fetcher(pdsUrl, did, collection)),
  );

  return collections.flat();
}
