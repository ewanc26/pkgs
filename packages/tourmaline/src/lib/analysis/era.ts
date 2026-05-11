import type { AggregatedData } from './aggregator';
import type { ArtistInfo, EraEntry } from '$lib/types';

/**
 * Build an era preference profile from artist start years.
 * Uses the MusicBrainz life-span.begin date to determine when
 * each artist started, then weights by play count.
 *
 * This is a proxy — it measures when the artists you listen to
 * emerged, not when the specific tracks were released. Artists with
 * long careers (e.g. Iron Maiden, started 1975) push toward earlier
 * decades even if you mostly listen to their recent output.
 * Still, it's a reasonable approximation of era preference.
 */
export function buildEraProfile(
	data: AggregatedData,
	artistInfos: Map<string, ArtistInfo>
): EraEntry[] {
	const decadeCounts = new Map<string, number>();

	for (const { name, count } of data.topArtists) {
		const info = artistInfos.get(name);
		if (!info?.startYear) continue;

		const decade = `${Math.floor(info.startYear / 10) * 10}s`;
		decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + count);
	}

	return [...decadeCounts.entries()]
		.map(([decade, count]) => ({ decade, count }))
		.sort((a, b) => a.decade.localeCompare(b.decade));
}
