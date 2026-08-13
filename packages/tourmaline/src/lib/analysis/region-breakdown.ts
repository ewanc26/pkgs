import type { AggregatedData } from "./aggregator";
import type { ArtistInfo } from "$lib/types";

export interface RegionEntry {
  area: string;
  areaCode?: string;
  weight: number;
}

/**
 * Ranked list of artist countries/regions of origin (MusicBrainz `area`),
 * weighted two ways so callers can toggle between "how many scrobbles come
 * from this region" and "how many distinct artists come from this region".
 *
 * Only covers artists whose enrichment resolved a MusicBrainz area — many
 * artists (unmatched, or matched but with no area on file) are simply
 * excluded rather than bucketed into an "unknown" entry.
 */
export interface RegionProfile {
  byScrobbles: RegionEntry[];
  byArtistCount: RegionEntry[];
}

/**
 * Build the region profile from aggregated data and enriched artist info.
 * Mirrors buildGenreProfile()/buildTagsProfile()'s iteration pattern: walk
 * the full artistPlayCounts map (not just top-N) and look up enrichment
 * per artist.
 */
export function buildRegionProfile(
  data: AggregatedData,
  artistInfos: Map<string, ArtistInfo>,
  limit = 15,
): RegionProfile {
  const scrobbleWeights = new Map<string, { areaCode?: string; weight: number }>();
  const artistWeights = new Map<string, { areaCode?: string; weight: number }>();

  for (const [name, count] of data.artistPlayCounts) {
    const info = artistInfos.get(name);
    if (!info?.area) continue;

    const s = scrobbleWeights.get(info.area) ?? { areaCode: info.areaCode, weight: 0 };
    s.weight += count;
    scrobbleWeights.set(info.area, s);

    const a = artistWeights.get(info.area) ?? { areaCode: info.areaCode, weight: 0 };
    a.weight += 1;
    artistWeights.set(info.area, a);
  }

  const toRanked = (
    weights: Map<string, { areaCode?: string; weight: number }>,
  ): RegionEntry[] =>
    [...weights.entries()]
      .map(([area, v]) => ({ area, areaCode: v.areaCode, weight: v.weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);

  return {
    byScrobbles: toRanked(scrobbleWeights),
    byArtistCount: toRanked(artistWeights),
  };
}
