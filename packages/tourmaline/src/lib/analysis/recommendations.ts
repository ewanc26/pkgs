/**
 * "You might like" recommendations, built entirely from data already fetched
 * during artist enrichment (Last.fm similar-artist data via ArtistInfo.similar)
 * — no extra API calls.
 */
import type { ArtistInfo } from "$lib/types";

export interface Recommendation {
  name: string;
  mbId?: string;
  /** The listener's own top artists that surfaced this recommendation, most-played first. */
  recommendedBy: string[];
  /** Number of the listener's top artists that recommend this one. */
  score: number;
}

/** How many of the listener's top artists to draw similar-artist candidates from. */
const MAX_SOURCE_ARTISTS = 25;
const MAX_RECOMMENDATIONS = 20;

/**
 * Recommend artists the listener doesn't already listen to, ranked by how
 * many of their top artists point to each candidate as similar.
 */
export function buildRecommendations(
  topArtists: Array<{ name: string; count: number }>,
  allArtists: string[],
  artistInfos: Map<string, ArtistInfo>,
): Recommendation[] {
  const known = new Set(allArtists.map((a) => a.toLowerCase()));
  const candidates = new Map<string, Recommendation>();

  const sourceArtists = topArtists.slice(0, MAX_SOURCE_ARTISTS);

  for (const { name: sourceName } of sourceArtists) {
    const info = artistInfos.get(sourceName);
    if (!info?.similar?.length) continue;

    for (const sim of info.similar) {
      if (!sim.name) continue;
      const key = sim.name.toLowerCase();
      if (known.has(key)) continue; // already in the listener's library

      const existing = candidates.get(key);
      if (existing) {
        existing.score++;
        if (!existing.recommendedBy.includes(sourceName)) {
          existing.recommendedBy.push(sourceName);
        }
      } else {
        candidates.set(key, {
          name: sim.name,
          mbId: sim.mbId,
          recommendedBy: [sourceName],
          score: 1,
        });
      }
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECOMMENDATIONS);
}
