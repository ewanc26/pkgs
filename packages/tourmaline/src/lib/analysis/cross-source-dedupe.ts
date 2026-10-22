import {
  CROSS_SOURCE_WINDOW_MS,
  sourceOf,
  type Source,
} from "@ewanc26/croft-click-core/merge";
import { normalizeString } from "@ewanc26/croft-click-core/normalize";
import type { TealScrobble } from "../types.ts";

interface Entry {
  scrobble: TealScrobble;
  time: number;
  sources: Set<Source>;
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
 * Collapse the same listen reported by different sources (e.g. a Last.fm
 * import plus a Spotify import or a live scrobbler). Spotify/Apple timestamps
 * are play *end* times while others are *start* times, so matching uses a
 * wide window; it is one-to-one per source so genuine repeats survive.
 * Input order is preserved apart from removed duplicates.
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
  const kept = new Map<number, Entry>();

  for (const { scrobble, index, time } of order) {
    const source = sourceOf(scrobble);
    const key = `${norm(scrobble.trackName)}\u0000${norm(scrobble.artists[0]?.name)}`;
    const group = byTrack.get(key) ?? [];
    let match: Entry | undefined;
    for (let i = group.length - 1; i >= 0; i--) {
      if (time - group[i].time > windowMs) break;
      if (!group[i].sources.has(source)) {
        match = group[i];
        break;
      }
    }
    if (match) {
      match.sources.add(source);
      if (richness(scrobble) > richness(match.scrobble)) {
        for (const [idx, e] of kept) if (e === match) kept.delete(idx);
        match.scrobble = scrobble;
        kept.set(index, match);
      }
      continue;
    }
    const entry: Entry = { scrobble, time, sources: new Set([source]) };
    group.push(entry);
    byTrack.set(key, group);
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
