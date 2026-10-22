import {
  CROSS_SOURCE_WINDOW_MS,
  SAME_SOURCE_EVENT_WINDOW_MS,
  streamOf,
} from "@ewanc26/croft-click-core/merge";
import { normalizeString } from "@ewanc26/croft-click-core/normalize";
import type { TealScrobble } from "../types.ts";

interface Entry {
  scrobble: TealScrobble;
  time: number;
  streams: Set<string>;
}

const norm = (v: string | undefined) =>
  normalizeString(v ?? "") || (v ?? "").trim().toLowerCase();

/** How much usable metadata a scrobble carries; richer wins when two collapse. */
function richness(s: TealScrobble): number {
  return (
    (s.recordingMbId || s.trackMbId ? 2 : 0) +
    (s.artists[0]?.mbId ? 1 : 0) +
    (s.releaseName ? 1 : 0) +
    (s.duration ? 1 : 0)
  );
}

/**
 * Collapse duplicate listens. Each stream matches one-to-one with other streams
 * within CROSS_SOURCE_WINDOW_MS (Spotify/Apple timestamps are play *end* times,
 * others are *start*). Repeats within one stream closer than
 * SAME_SOURCE_EVENT_WINDOW_MS are double-fired events and dropped; genuine
 * repeats further apart survive. Input order is preserved apart from removals.
 */
export function collapseCrossSource(
  scrobbles: TealScrobble[],
  windowMs: number = CROSS_SOURCE_WINDOW_MS,
): { scrobbles: TealScrobble[]; removed: number } {
  const order = scrobbles
    .map((scrobble, index) => ({
      scrobble,
      index,
      time: Date.parse(scrobble.playedTime),
    }))
    .filter((r) => !Number.isNaN(r.time))
    .sort((a, b) => a.time - b.time || a.index - b.index);

  const byTrack = new Map<string, Entry[]>();
  const lastInStream = new Map<string, number>();
  const kept = new Map<number, Entry>();

  for (const { scrobble, index, time } of order) {
    const stream = streamOf(scrobble);
    const track = `${norm(scrobble.trackName)}\u0000${norm(scrobble.artists[0]?.name)}`;

    const streamKey = `${track}\u0000${stream}`;
    const previous = lastInStream.get(streamKey);
    if (
      previous !== undefined &&
      time - previous <= SAME_SOURCE_EVENT_WINDOW_MS
    )
      continue;
    lastInStream.set(streamKey, time);

    const group = byTrack.get(track) ?? [];
    let match: Entry | undefined;
    for (let i = group.length - 1; i >= 0; i--) {
      if (time - group[i].time > windowMs) break;
      if (!group[i].streams.has(stream)) {
        match = group[i];
        break;
      }
    }
    if (match) {
      match.streams.add(stream);
      if (richness(scrobble) > richness(match.scrobble)) {
        for (const [idx, e] of kept) if (e === match) kept.delete(idx);
        match.scrobble = scrobble;
        kept.set(index, match);
      }
      continue;
    }
    const entry: Entry = { scrobble, time, streams: new Set([stream]) };
    group.push(entry);
    byTrack.set(track, group);
    kept.set(index, entry);
  }

  const out: TealScrobble[] = [];
  let removed = 0;
  scrobbles.forEach((s, i) => {
    if (Number.isNaN(Date.parse(s.playedTime))) out.push(s);
    else if (kept.has(i)) out.push(kept.get(i)!.scrobble);
    else removed++;
  });
  return { scrobbles: out, removed };
}
