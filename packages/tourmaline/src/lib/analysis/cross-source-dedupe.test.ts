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

test("matches across streams of the same service (Apple import vs live)", () => {
  const imported = play({
    domain: "https://music.apple.com",
    submissionClientAgent: "malachite/0.19.10",
    playedTime: "2026-08-01T10:00:00Z",
    duration: 200,
  });
  const live = play({
    domain: "https://music.apple.com",
    submissionClientAgent: "piper/0.1.1",
    playedTime: "2026-08-01T10:02:50Z",
    duration: 200,
  });
  const { scrobbles, removed } = collapseCrossSource([imported, live]);
  assert.equal(removed, 1);
  assert.equal(scrobbles.length, 1);
});

test("drops same-stream double fires within 5 seconds", () => {
  const a = play({
    domain: "https://music.apple.com",
    submissionClientAgent: "malachite/0.19.10",
    playedTime: "2026-08-01T10:00:00Z",
  });
  const b = play({
    domain: "https://music.apple.com",
    submissionClientAgent: "malachite/0.19.10",
    playedTime: "2026-08-01T10:00:03Z",
  });
  assert.equal(collapseCrossSource([a, b]).removed, 1);
});

test("same-stream window is measured from the last kept play, not the last seen one", () => {
  const times = ["10:00:00", "10:00:04", "10:00:08", "10:00:20"];
  const chain = times.map((t) =>
    play({
      domain: "spotify.com",
      submissionClientAgent: "malachite/0.19.10",
      playedTime: `2024-01-01T${t}Z`,
    }),
  );
  const { scrobbles, removed } = collapseCrossSource(chain);
  assert.equal(removed, 1);
  assert.deepEqual(
    scrobbles.map((s) => s.playedTime),
    ["2024-01-01T10:00:00Z", "2024-01-01T10:00:08Z", "2024-01-01T10:00:20Z"],
  );
});
