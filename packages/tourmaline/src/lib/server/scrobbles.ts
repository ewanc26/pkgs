import type { TealScrobble } from "$lib/types";

interface ListRecordsResponse {
  records: Array<{
    uri: string;
    cid: string;
    value: Record<string, unknown>;
  }>;
  cursor?: string;
}

function parseScrobble(v: Record<string, unknown>): TealScrobble {
  return {
    trackName: v.trackName as string,
    artists:
      (v.artists as Array<Record<string, unknown>>)?.map((a) => ({
        name: (a.artistName ?? a.name) as string,
        mbId: (a.artistMbId ?? a.mbId) as string | undefined,
      })) ?? [],
    releaseName: v.releaseName as string | undefined,
    trackMbId: v.trackMbId as string | undefined,
    recordingMbId: v.recordingMbId as string | undefined,
    releaseMbId: v.releaseMbId as string | undefined,
    duration: v.duration as number | undefined,
    originUrl: v.originUrl as string | undefined,
    playedTime:
      typeof v.playedTime === "string"
        ? v.playedTime
        : new Date(v.playedTime as number).toISOString(),
    submissionClientAgent: v.submissionClientAgent as string | undefined,
    musicServiceBaseDomain: v.musicServiceBaseDomain as string | undefined,
    trackDiscriminant: v.trackDiscriminant as string | undefined,
    releaseDiscriminant: v.releaseDiscriminant as string | undefined,
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
      collection: "fm.teal.alpha.feed.play",
      limit: String(limit),
    });
    if (currentCursor) params.set("cursor", currentCursor);

    const url = `${pdsUrl}/xrpc/com.atproto.repo.listRecords?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`listRecords failed: ${res.status} ${body}`);
    }

    const data: ListRecordsResponse = await res.json();

    for (const record of data.records) {
      batch.push(parseScrobble(record.value));
    }

    currentCursor = data.cursor ?? null;
    if (!currentCursor || data.records.length === 0) {
      return { scrobbles: batch, cursor: null, done: true };
    }
  }

  return { scrobbles: batch, cursor: currentCursor, done: false };
}
