import { describe, expect, it } from "vitest";
import type { CARRecord } from "@ewanc26/croft-click-core";
import {
  LEGACY_TEAL_LEXICON,
  STABLE_TEAL_LEXICON,
  TEAL_PLAY_COLLECTIONS,
  fetchTealPlayRecords,
  parseScrobbleRecords,
} from "./scrobble-records";

function record(
  collection: string,
  rkey: string,
  value: Record<string, unknown>,
): CARRecord {
  return {
    rkey,
    uri: `at://did:plc:test/${collection}/${rkey}`,
    cid: `cid-${rkey}`,
    value,
  };
}

describe("Teal play CAR records", () => {
  it("fetches and merges legacy and production collections", async () => {
    const calls: string[] = [];
    const legacy = record(LEGACY_TEAL_LEXICON, "legacy", {
      trackName: "Legacy track",
      artists: [{ artistName: "Legacy artist" }],
      playedTime: "2026-01-01T00:00:00.000Z",
    });
    const stable = record(STABLE_TEAL_LEXICON, "stable", {
      trackName: "Stable track",
      artists: [{ artistName: "Stable artist" }],
      playedTime: "2026-01-02T00:00:00.000Z",
    });

    const merged = await fetchTealPlayRecords(
      "https://pds.example",
      "did:plc:test",
      async (_pdsUrl, _did, collection) => {
        calls.push(collection);
        return collection === LEGACY_TEAL_LEXICON ? [legacy] : [stable];
      },
    );

    expect(calls).toEqual([...TEAL_PLAY_COLLECTIONS]);
    expect(merged).toEqual([legacy, stable]);
  });

  it("preserves legacy fields and reads production URI fields", () => {
    const [legacy, stable] = parseScrobbleRecords([
      record(LEGACY_TEAL_LEXICON, "legacy", {
        trackName: "Legacy track",
        artists: [{ artistName: "Legacy artist", artistMbId: "mbid:legacy" }],
        originUrl: "https://legacy.example/track",
        musicServiceBaseDomain: "legacy.example",
        playedTime: "2026-01-01T00:00:00.000Z",
      }),
      record(STABLE_TEAL_LEXICON, "stable", {
        trackName: "Stable track",
        artists: [{ artistName: "Stable artist", artistMbId: "mbid:stable" }],
        originUri: "https://stable.example/track",
        musicServiceUri: "https://music.example",
        playedTime: "2026-01-02T00:00:00.000Z",
      }),
    ]);

    expect(legacy).toMatchObject({
      trackName: "Legacy track",
      originUrl: "https://legacy.example/track",
      musicServiceBaseDomain: "legacy.example",
    });
    expect(stable).toMatchObject({
      trackName: "Stable track",
      originUrl: "https://stable.example/track",
      musicServiceBaseDomain: "music.example",
    });
  });
});
