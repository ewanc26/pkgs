import type { AggregatedData } from "./aggregator";
import type { ArtistInfo, DiscoveredArtist, DiscoveredItem } from "$lib/types";

/**
 * Build a list of discovered artists — all artists ordered by when
 * they were first heard (most recently discovered first).
 *
 * Pass `sinceDate` (YYYY-MM-DD) to limit to artists discovered after
 * that date (e.g. start of the current year).
 */
export function buildDiscoveredArtists(
  data: AggregatedData,
  artistInfos: Map<string, ArtistInfo>,
  sinceDate?: string,
): DiscoveredArtist[] {
  return [...data.artistFirstListen.entries()]
    .filter(([, firstListen]) => !sinceDate || firstListen >= sinceDate)
    .map(([name, firstListen]) => ({
      name,
      firstListen,
      count: data.artistPlayCounts.get(name) ?? 0,
      imageUrl: artistInfos.get(name)?.imageUrl,
    }))
    .sort((a, b) => b.firstListen.localeCompare(a.firstListen))
    .slice(0, 50);
}

export function buildDiscoveredTracks(
  data: AggregatedData,
  sinceDate?: string,
): DiscoveredItem[] {
  return [...data.trackFirstListen.entries()]
    .filter(([, firstListen]) => !sinceDate || firstListen >= sinceDate)
    .map(([key, firstListen]) => {
      const sepIdx = key.indexOf("|||");
      const name = sepIdx >= 0 ? key.slice(0, sepIdx) : key;
      const artistStr = sepIdx >= 0 ? key.slice(sepIdx + 3) : "";
      const artist = artistStr.split(",")[0] ?? "";
      return {
        name,
        artist,
        firstListen,
        count: data.trackPlayCounts.get(name) ?? 0,
      };
    })
    .sort((a, b) => b.firstListen.localeCompare(a.firstListen))
    .slice(0, 50);
}

export function buildDiscoveredAlbums(
  data: AggregatedData,
  sinceDate?: string,
): DiscoveredItem[] {
  return [...data.albumFirstListen.entries()]
    .filter(([, firstListen]) => !sinceDate || firstListen >= sinceDate)
    .map(([key, firstListen]) => {
      const sepIdx = key.indexOf("|||");
      const name = sepIdx >= 0 ? key.slice(0, sepIdx) : key;
      const artistStr = sepIdx >= 0 ? key.slice(sepIdx + 3) : "";
      const artist = artistStr.split(",")[0] ?? "";
      return {
        name,
        artist,
        firstListen,
        count: data.albumPlayCounts.get(key)?.count ?? 0,
      };
    })
    .sort((a, b) => b.firstListen.localeCompare(a.firstListen))
    .slice(0, 50);
}
