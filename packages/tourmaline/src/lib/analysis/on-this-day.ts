import type { TealScrobble } from '$lib/types';

export interface OnThisDayEntry {
	year: number;
	topArtist: string;
	topArtistCount: number;
	scrobbleCount: number;
}

/**
 * Find what the user listened to on this day in previous years.
 * Returns up to 5 entries, sorted newest-first.
 */
export function buildOnThisDay(scrobbles: TealScrobble[]): OnThisDayEntry[] {
	if (scrobbles.length === 0) return [];

	const now = new Date();
	const currentYear = now.getFullYear();
	const todayMMDD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

	// Group scrobbles by year for today's date
	const byYear = new Map<number, { artistCounts: Map<string, number>; total: number }>();

	for (const scrobble of scrobbles) {
		const date = new Date(scrobble.playedTime);
		if (isNaN(date.getTime())) continue;

		const year = date.getFullYear();
		if (year >= currentYear) continue; // Skip current year

		const mmdd = scrobble.playedTime.substring(5, 10);
		if (mmdd !== todayMMDD) continue;

		let entry = byYear.get(year);
		if (!entry) {
			entry = { artistCounts: new Map(), total: 0 };
			byYear.set(year, entry);
		}

		entry.total++;
		const artist = scrobble.artists[0]?.name ?? 'Unknown';
		entry.artistCounts.set(artist, (entry.artistCounts.get(artist) ?? 0) + 1);
	}

	// Build entries, sorted newest-first
	const entries: OnThisDayEntry[] = [];
	for (const [year, data] of byYear) {
		let topArtist = 'Unknown';
		let topArtistCount = 0;
		for (const [name, count] of data.artistCounts) {
			if (count > topArtistCount) {
				topArtist = name;
				topArtistCount = count;
			}
		}
		entries.push({
			year,
			topArtist,
			topArtistCount,
			scrobbleCount: data.total
		});
	}

	return entries.sort((a, b) => b.year - a.year).slice(0, 5);
}
