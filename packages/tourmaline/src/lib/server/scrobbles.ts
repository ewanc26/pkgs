import { fetchRepoViaCAR } from "@ewanc26/croft-click-core";
import type { TealScrobble } from "$lib/types";
import {
  fetchTealPlayRecords,
  parseScrobbleRecords,
} from "$lib/server/scrobble-records";

export interface ScrobbleBatchResult {
  scrobbles: TealScrobble[];
  cursor: string | null;
  done: boolean;
}

/**
 * Fetch both Teal play collections via the CAR export
 * (`com.atproto.sync.getRepo`) and parse the records locally.
 *
 * The response is intentionally one-shot: `cursor` is always null and `done`
 * always true, so the client loop exits after the two CAR reads complete.
 */
export async function fetchScrobbleBatch(
  pdsUrl: string,
  did: string,
): Promise<ScrobbleBatchResult> {
  const records = await fetchTealPlayRecords(
    pdsUrl,
    did,
    (repoUrl, repoDid, collection) =>
      fetchRepoViaCAR(repoUrl, repoDid, collection),
  );

  return {
    scrobbles: parseScrobbleRecords(records),
    cursor: null,
    done: true,
  };
}
