import assert from "node:assert/strict";
import { test } from "node:test";
import { collapseCrossSource } from "./cross-source-dedupe.ts";
import type { TealScrobble } from "../types.ts";

const play = (
  over: Partial<TealScrobble> & { playedTime: string; domain: string },
): TealScrobble => {
  const { domain, ...rest } = over;
  return {
    trackName: "Song",
    artists: [{ name: "Artist" }],
    musicServiceBaseDomain: domain,
    ...rest,
  };
};

test("collapses the same listen across sources, keeping the richer record", () => {
  const lfm = play({
    domain: "last.fm",
    playedTime: "2024-01-01T10:00:00Z",
    recordingMbId: "x",
  });
  const spot = play({
    domain: "spotify.com",
    playedTime: "2024-01-01T10:03:30Z",
  });
  const { scrobbles, removed } = collapseCrossSource([lfm, spot]);
  assert.equal(removed, 1);
  assert.equal(scrobbles[0], lfm);
});

test("keeps genuine same-source repeats", () => {
  const a = play({ domain: "spotify.com", playedTime: "2024-01-01T10:00:00Z" });
  const b = play({ domain: "spotify.com", playedTime: "2024-01-01T10:04:00Z" });
  assert.equal(collapseCrossSource([a, b]).removed, 0);
});

test("matches one-to-one per source", () => {
  const l1 = play({ domain: "last.fm", playedTime: "2024-01-01T10:00:00Z" });
  const l2 = play({ domain: "last.fm", playedTime: "2024-01-01T10:04:00Z" });
  const s1 = play({
    domain: "spotify.com",
    playedTime: "2024-01-01T10:03:00Z",
  });
  assert.equal(collapseCrossSource([l1, l2, s1]).removed, 1);
});

test("does not merge distinct tracks, far-apart plays or non-Latin titles", () => {
  const a = play({
    domain: "last.fm",
    playedTime: "2024-01-01T10:00:00Z",
    trackName: "怪物",
  });
  const b = play({
    domain: "spotify.com",
    playedTime: "2024-01-01T10:02:00Z",
    trackName: "夜に駆ける",
  });
  const c = play({
    domain: "spotify.com",
    playedTime: "2024-01-01T12:00:00Z",
    trackName: "怪物",
  });
  assert.equal(collapseCrossSource([a, b, c]).removed, 0);
});

test("preserves order and unparseable timestamps", () => {
  const bad = play({ domain: "last.fm", playedTime: "nope" });
  const a = play({ domain: "last.fm", playedTime: "2024-01-01T10:00:00Z" });
  assert.deepEqual(collapseCrossSource([bad, a]).scrobbles, [bad, a]);
});
