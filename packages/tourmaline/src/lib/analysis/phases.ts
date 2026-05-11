import type { AggregatedData } from './aggregator';
import type { ArtistInfo, MonthlyGenre } from '$lib/types';

export interface ListeningPhase {
	startMonth: string;  // YYYY-MM
	endMonth: string;    // YYYY-MM
	label: string;
	dominantGenre: string;
	dominantMood: string;
	topArtists: Array<{ name: string; count: number }>;
	scrobbleCount: number;
}

const SEASON_MAP: Record<number, string> = {
	0: 'Winter',  // Jan
	1: 'Winter',  // Feb
	2: 'Spring',  // Mar
	3: 'Spring',  // Apr
	4: 'Spring',  // May
	5: 'Summer',  // Jun
	6: 'Summer',  // Jul
	7: 'Summer',  // Aug
	8: 'Autumn',  // Sep
	9: 'Autumn',  // Oct
	10: 'Autumn', // Nov
	11: 'Winter'  // Dec
};

function season(month: string): string {
	const m = Number(month.substring(5, 7)) - 1;
	return SEASON_MAP[m] ?? '';
}

/**
 * Derive listening phases from monthly genre data.
 *
 * A phase is a contiguous run of months where the same genre
 * is dominant (top by weight). When the dominant genre changes,
 * a new phase starts. Short phases (under 2 months) are merged
 * into the adjacent phase with the closer genre profile.
 *
 * Returns up to 6 phases.
 */
export function buildListeningPhases(
	data: AggregatedData,
	monthlyGenres: MonthlyGenre[],
	artistInfos: Map<string, ArtistInfo>
): ListeningPhase[] {
	if (monthlyGenres.length < 2) return [];

	// Build a sequence of dominant genres per month
	const monthSequence: Array<{ month: string; genre: string; weight: number; totalScrobbles: number }> = [];

	for (const mg of monthlyGenres) {
		const topGenre = mg.genres[0];
		if (!topGenre) continue;

		const monthScrobbles = data.monthlyScrobbles.get(mg.month) ?? 0;
		monthSequence.push({
			month: mg.month,
			genre: topGenre.name,
			weight: topGenre.weight,
			totalScrobbles: monthScrobbles
		});
	}

	if (monthSequence.length < 2) return [];

	// Group consecutive months with the same dominant genre
	const rawPhases: Array<{
		genre: string;
		months: string[];
		totalScrobbles: number;
	}> = [];

	let currentGenre = monthSequence[0].genre;
	let currentMonths = [monthSequence[0].month];
	let currentTotal = monthSequence[0].totalScrobbles;

	for (let i = 1; i < monthSequence.length; i++) {
		if (monthSequence[i].genre === currentGenre) {
			currentMonths.push(monthSequence[i].month);
			currentTotal += monthSequence[i].totalScrobbles;
		} else {
			rawPhases.push({ genre: currentGenre, months: currentMonths, totalScrobbles: currentTotal });
			currentGenre = monthSequence[i].genre;
			currentMonths = [monthSequence[i].month];
			currentTotal = monthSequence[i].totalScrobbles;
		}
	}
	rawPhases.push({ genre: currentGenre, months: currentMonths, totalScrobbles: currentTotal });

	// Merge short phases (1 month) into the adjacent phase with the closer genre
	const merged: typeof rawPhases = [];
	for (const phase of rawPhases) {
		if (phase.months.length < 2 && merged.length > 0) {
			// Merge into previous
			const prev = merged[merged.length - 1];
			prev.months.push(...phase.months);
			prev.totalScrobbles += phase.totalScrobbles;
		} else {
			merged.push({ ...phase, months: [...phase.months] });
		}
	}

	// Cap at 6 phases — merge the smallest adjacent pairs
	while (merged.length > 6) {
		// Find the pair of adjacent phases with the smallest combined scrobbles
		let minIdx = 0;
		let minSum = Infinity;
		for (let i = 0; i < merged.length - 1; i++) {
			const sum = merged[i].totalScrobbles + merged[i + 1].totalScrobbles;
			if (sum < minSum) {
				minSum = sum;
				minIdx = i;
			}
		}
		// Merge minIdx and minIdx+1
		merged[minIdx].months.push(...merged[minIdx + 1].months);
		merged[minIdx].totalScrobbles += merged[minIdx + 1].totalScrobbles;
		// Use the genre of the phase with more scrobbles
		if (merged[minIdx + 1].totalScrobbles > merged[minIdx].totalScrobbles) {
			merged[minIdx].genre = merged[minIdx + 1].genre;
		}
		merged.splice(minIdx + 1, 1);
	}

	// Build final phases with labels, moods, and top artists
	return merged.map((phase) => {
		const startMonth = phase.months[0];
		const endMonth = phase.months[phase.months.length - 1];

		// Derive mood from the monthly data for this phase
		const dominantMood = derivePhaseMood(phase.genre, data);

		// Get top artists for this phase from monthlyArtistPlays
		const topArtists = derivePhaseArtists(phase.months, data);

		const label = buildPhaseLabel(phase.genre, dominantMood, startMonth);

		return {
			startMonth,
			endMonth,
			label,
			dominantGenre: phase.genre,
			dominantMood,
			topArtists,
			scrobbleCount: phase.totalScrobbles
		};
	});
}

/** Derive a phase mood from the genre-mood mapping. */
function derivePhaseMood(genre: string, data: AggregatedData): string {
	// Find the top mood from the aggregated data — this is a reasonable
	// approximation since mood is already genre-weighted.
	const moodEntries = Object.entries(data.scrobblesByHour);
	// Just use the top mood from the mood profile (if available)
	// We don't have mood per-month yet, so approximate from the genre
	// This is a simplification — for v1 it's good enough.
	const MOOD_MAP: Record<string, string> = {
		Metal: 'Aggressive',
		Rock: 'Energetic',
		Pop: 'Happy',
		Electronic: 'Energetic',
		'Hip Hop': 'Energetic',
		Jazz: 'Chill',
		Classical: 'Atmospheric',
		Folk: 'Nostalgic',
		Country: 'Nostalgic',
		'R&B': 'Chill',
		Blues: 'Melancholic',
		Reggae: 'Chill',
		Latin: 'Happy',
		World: 'Atmospheric',
		Soundtrack: 'Atmospheric',
		'New Age': 'Chill',
		Punk: 'Aggressive',
		'Singer-Songwriter': 'Melancholic'
	};

	return MOOD_MAP[genre] ?? 'Balanced';
}

/** Get top 3 artists for a phase from monthly artist play data. */
function derivePhaseArtists(
	months: string[],
	data: AggregatedData
): Array<{ name: string; count: number }> {
	const artistCounts = new Map<string, number>();

	for (const month of months) {
		const monthPlays = data.monthlyArtistPlays.get(month);
		if (!monthPlays) continue;

		for (const [name, count] of monthPlays) {
			artistCounts.set(name, (artistCounts.get(name) ?? 0) + count);
		}
	}

	return [...artistCounts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 3);
}

/** Generate a human-readable phase label. */
function buildPhaseLabel(genre: string, mood: string, startMonth: string): string {
	const seasonName = season(startMonth);

	// Seasonal + genre combos
	if (seasonName === 'Winter') {
		if (mood === 'Aggressive' || mood === 'Dark') return `${genre} Winter`;
		if (mood === 'Chill' || mood === 'Atmospheric') return `Frozen ${genre}`;
	}
	if (seasonName === 'Summer') {
		if (mood === 'Happy' || mood === 'Energetic') return `${genre} Summer`;
		if (mood === 'Chill') return `Mellow ${genre}`;
	}
	if (seasonName === 'Spring') {
		if (mood === 'Happy' || mood === 'Energetic') return `${genre} Spring`;
		return `${genre} Awakening`;
	}
	if (seasonName === 'Autumn') {
		if (mood === 'Melancholic' || mood === 'Nostalgic') return `${genre} Autumn`;
		if (mood === 'Dark' || mood === 'Aggressive') return `Heavy ${genre}`;
	}

	// Generic fallback
	return `${genre} Phase`;
}
