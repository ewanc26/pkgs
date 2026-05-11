import type { ListenerProfile } from '$lib/types';
import type { ListeningPhase } from './phases';

export interface StoryRecapCard {
	type:
		| 'intro'
		| 'totals'
		| 'top-artist'
		| 'top-track'
		| 'top-album'
		| 'mood'
		| 'evolution'
		| 'standout-day'
		| 'streak'
		| 'discovery'
		| 'outro';
	heading: string;
	body: string;
	stat?: string;
	statLabel?: string;
}

export interface StoryRecap {
	year: number;
	cards: StoryRecapCard[];
}

/**
 * Build a story-mode recap from the listener profile and derived data.
 * Turns stats into a narrative sequence of cards.
 */
export function buildStoryRecap(
	profile: ListenerProfile,
	displayName: string,
	phases: ListeningPhase[]
): StoryRecap {
	const year = new Date().getFullYear();
	const cards: StoryRecapCard[] = [];

	// Intro
	cards.push({
		type: 'intro',
		heading: `Your ${year} in music`,
		body: `${displayName}'s listening story`
	});

	// Totals
	const hours = Math.floor(profile.totalMinutes / 60);
	const days = Math.floor(profile.totalMinutes / 1440);
	cards.push({
		type: 'totals',
		heading: `${hours.toLocaleString()} hours of music`,
		body: days >= 1
			? `That's ${days.toLocaleString()} day${days === 1 ? '' : 's'} of non-stop listening across ${profile.uniqueArtists.toLocaleString()} artists`
			: `Across ${profile.uniqueArtists.toLocaleString()} unique artists`,
		stat: profile.totalScrobbles.toLocaleString(),
		statLabel: 'scrobbles'
	});

	// Top artist
	const topArtist = profile.topArtists[0];
	if (topArtist) {
		cards.push({
			type: 'top-artist',
			heading: 'Your #1 artist',
			body: topArtist.name,
			stat: topArtist.count.toLocaleString(),
			statLabel: 'plays'
		});
	}

	// Top track
	const topTrack = profile.topTracks[0];
	if (topTrack) {
		cards.push({
			type: 'top-track',
			heading: 'Your #1 track',
			body: `${topTrack.name} — ${topTrack.artist}`,
			stat: topTrack.count.toLocaleString(),
			statLabel: 'plays'
		});
	}

	// Top album
	const topAlbum = profile.topAlbums[0];
	if (topAlbum) {
		cards.push({
			type: 'top-album',
			heading: 'Your #1 album',
			body: `${topAlbum.name} — ${topAlbum.artist}`,
			stat: topAlbum.count.toLocaleString(),
			statLabel: 'plays'
		});
	}

	// Mood
	const topMood = Object.entries(profile.mood).sort(([, a], [, b]) => b - a)[0];
	if (topMood) {
		const moodDescriptions: Record<string, string> = {
			Energetic: 'Your year ran on adrenaline and rhythm',
			Melancholic: 'You found beauty in the bittersweet this year',
			Chill: 'You kept things measured and low-pressure',
			Happy: 'Bright sounds carried your year',
			Aggressive: 'You chased intensity and rawforce',
			Atmospheric: 'You lived inside the texture of sound',
			Nostalgic: 'You spent the year looking backwards through music',
			Dark: 'You were drawn to shadow and weight this year'
		};
		cards.push({
			type: 'mood',
			heading: `Your year sounded ${topMood[0].toLowerCase()}`,
			body: moodDescriptions[topMood[0]] ?? `${topMood[0]} defined your listening`
		});
	}

	// Evolution (phases)
	if (phases.length >= 2) {
		const phaseNames = phases.map((p) => p.label).join(' → ');
		cards.push({
			type: 'evolution',
			heading: `${phases.length} listening phases`,
			body: phaseNames,
			stat: phases.length.toString(),
			statLabel: 'phases'
		});
	}

	// Standout day
	const biggestDay = profile.remarkableDays.find((d) => d.type === 'biggest');
	if (biggestDay) {
		cards.push({
			type: 'standout-day',
			heading: 'Your biggest day',
			body: biggestDay.detail,
			stat: biggestDay.count.toLocaleString(),
			statLabel: 'scrobbles'
		});
	}

	// Streak (from dailyScrobbles)
	const streak = longestStreak(profile.dailyScrobbles.map((d) => d.date));
	if (streak >= 7) {
		cards.push({
			type: 'streak',
			heading: 'Longest listening streak',
			body: `${streak} consecutive days of music`,
			stat: streak.toString(),
			statLabel: 'days'
		});
	}

	// Discovery
	const discoveryCount = profile.discoveredArtists.length;
	if (discoveryCount > 0) {
		cards.push({
			type: 'discovery',
			heading: 'New artists discovered',
			body: discoveryCount >= 50
				? `You explored ${discoveryCount.toLocaleString()} new artists — restless taste`
				: `${discoveryCount.toLocaleString()} new artists entered your rotation`,
			stat: discoveryCount.toLocaleString(),
			statLabel: 'artists'
		});
	}

	// Outro
	cards.push({
		type: 'outro',
		heading: `${profile.diversityScore}/100 diversity · ${profile.obscurityIndex}/100 obscurity`,
		body: profile.diversityScore >= 70
			? 'You cast a wide net — your taste refuses to stay in one place'
			: profile.diversityScore >= 40
				? 'A clear centre of gravity with room to explore'
				: 'You go deep on your favourites — commitment is a kind of taste'
	});

	return { year, cards };
}

/** Find the longest consecutive run of dates (YYYY-MM-DD). */
function longestStreak(dates: string[]): number {
	if (dates.length === 0) return 0;

	const sorted = [...dates].sort();
	let longest = 1;
	let current = 1;

	for (let i = 1; i < sorted.length; i++) {
		const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
		const curr = new Date(sorted[i] + 'T00:00:00Z');
		const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

		if (diffDays === 1) {
			current++;
			if (current > longest) longest = current;
		} else if (diffDays > 1) {
			current = 1;
		}
		// Same day = no change
	}

	return longest;
}
