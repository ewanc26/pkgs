import type { AggregatedData } from "./aggregator";
import type { ArtistInfo, GenreEntry } from "$lib/types";

/**
 * Ranked raw genre/tag strings, weighted two ways so callers can toggle
 * between "how many scrobbles carry this tag" and "how many distinct
 * artists carry this tag".
 *
 * Unlike genres.ts's buildGenreProfile(), this does NOT normalise tags into
 * the ~18 top-level CATEGORIES — it surfaces the actual MusicBrainz/Last.fm
 * tag/genre strings (e.g. "dream pop", "post-disco") for a more granular
 * view than the categorised Genre Profile chart.
 */
export interface TagsProfile {
  byScrobbles: GenreEntry[];
  byArtistCount: GenreEntry[];
}

/**
 * Build the tags profile from aggregated data and enriched artist info.
 * Uses the full artistPlayCounts map (not just top-N) so long-tail tags
 * are represented, mirroring buildGenreProfile()'s iteration pattern.
 */
export function buildTagsProfile(
  data: AggregatedData,
  artistInfos: Map<string, ArtistInfo>,
  limit = 20,
): TagsProfile {
  const byScrobbles = new Map<string, number>();
  const byArtistCount = new Map<string, number>();

  for (const [name, count] of data.artistPlayCounts) {
    const info = artistInfos.get(name);
    if (!info) continue;

    const seen = new Set<string>();
    for (const raw of [...info.genres, ...info.tags]) {
      const tag = raw.trim();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      byScrobbles.set(tag, (byScrobbles.get(tag) ?? 0) + count);
      byArtistCount.set(tag, (byArtistCount.get(tag) ?? 0) + 1);
    }
  }

  const toRanked = (weights: Map<string, number>): GenreEntry[] =>
    [...weights.entries()]
      .map(([name, weight]) => ({ name, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);

  return {
    byScrobbles: toRanked(byScrobbles),
    byArtistCount: toRanked(byArtistCount),
  };
}
