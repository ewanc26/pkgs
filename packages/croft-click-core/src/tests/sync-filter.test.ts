import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterNewRecords, type ExistingRecord } from "../sync.js";
import type { PlayRecord } from "../types.js";

const play = (
  over: Partial<PlayRecord> & { playedTime: string; domain: string },
): PlayRecord => {
  const { domain, ...rest } = over;
  return {
    trackName: "Song",
    artists: [{ artistName: "Artist" }],
    musicServiceBaseDomain: domain,
    ...rest,
  } as PlayRecord;
};

const existingMap = (...records: PlayRecord[]): Map<string, ExistingRecord> =>
  new Map(
    records.map((value, i) => [
      `at://did/fm.teal.feed.play/${i}`,
      { uri: `at://did/fm.teal.feed.play/${i}`, cid: `c${i}`, value },
    ]),
  );

describe("filterNewRecords", () => {
  it("drops a record that is already stored exactly", () => {
    const r = play({ domain: "last.fm", playedTime: "2024-01-01T10:00:00Z" });
    assert.deepEqual(filterNewRecords([r], existingMap(r)), []);
  });

  it("drops a same-source record within the dedup window", () => {
    const existing = play({
      domain: "last.fm",
      playedTime: "2024-01-01T10:00:00Z",
    });
    const incoming = play({
      domain: "last.fm",
      playedTime: "2024-01-01T10:00:30Z",
    });
    assert.deepEqual(filterNewRecords([incoming], existingMap(existing)), []);
  });

  it("keeps a genuine repeat of the same track from the same stream", () => {
    const existing = play({
      domain: "last.fm",
      playedTime: "2024-01-01T10:00:00Z",
    });
    const incoming = play({
      domain: "last.fm",
      playedTime: "2024-01-01T10:04:00Z",
    });
    assert.equal(filterNewRecords([incoming], existingMap(existing)).length, 1);
  });

  it("drops a Spotify end-time record that matches a Last.fm start-time record", () => {
    const lastfm = play({
      domain: "last.fm",
      playedTime: "2024-01-01T10:00:00Z",
    });
    const spotify = play({
      domain: "spotify.com",
      playedTime: "2024-01-01T10:03:40Z",
    });
    assert.deepEqual(filterNewRecords([spotify], existingMap(lastfm)), []);
  });

  it("matches cross-source one-to-one so a real repeat still gets through", () => {
    const lastfm = play({
      domain: "last.fm",
      playedTime: "2024-01-01T10:00:00Z",
    });
    const first = play({
      domain: "spotify.com",
      playedTime: "2024-01-01T10:03:00Z",
    });
    const second = play({
      domain: "spotify.com",
      playedTime: "2024-01-01T10:08:00Z",
    });
    const kept = filterNewRecords([first, second], existingMap(lastfm));
    assert.deepEqual(kept, [second]);
  });

  it("does not cross-match records whose service is unknown", () => {
    const existing = {
      trackName: "Song",
      artists: [{ artistName: "Artist" }],
      playedTime: "2024-01-01T10:00:00Z",
    } as PlayRecord;
    const incoming = play({
      domain: "spotify.com",
      playedTime: "2024-01-01T10:03:00Z",
    });
    assert.equal(filterNewRecords([incoming], existingMap(existing)).length, 1);
  });

  it("disables the cross-source tier when crossSourceWindowMs is 0", () => {
    const lastfm = play({
      domain: "last.fm",
      playedTime: "2024-01-01T10:00:00Z",
    });
    const spotify = play({
      domain: "spotify.com",
      playedTime: "2024-01-01T10:03:40Z",
    });
    const kept = filterNewRecords([spotify], existingMap(lastfm), {
      crossSourceWindowMs: 0,
    });
    assert.equal(kept.length, 1);
  });
});
