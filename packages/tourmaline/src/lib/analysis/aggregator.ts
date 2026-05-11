import type { TealScrobble } from '$lib/types';

export interface AggregatedData {
	totalScrobbles: number;
	totalMinutes: number;
	uniqueArtists: number;
	uniqueTracks: number;
	topArtists: Array<{ name: string; count: number }>;
	topTracks: Array<{ name: string; artist: string; count: number }>;
	topAlbums: Array<{ name: string; artist: string; count: number }>;
	artistPlayCounts: Map<string, number>;
	trackPlayCounts: Map<string, number>;
	albumPlayCounts: Map<string, { name: string; artist: string; count: number }>;
	scrobblesByHour: number[];
	scrobblesByDay: number[];
	scrobblesByHourDay: number[][];
	dailyScrobbles: Map<string, number>; // YYYY-MM-DD → count
	monthlyScrobbles: Map<string, number>; // YYYY-MM → count
	serviceOrigins: Map<string, number>;
	artistFirstListen: Map<string, string>; // artist → earliest YYYY-MM-DD
	/** YYYY-MM → (artist name → play count that month) */
	monthlyArtistPlays: Map<string, Map<string, number>>;
}

const TRACK_KEY = (s: TealScrobble) =>
	`${s.trackName}|||${s.artists.map((a) => a.name).join(',')}`;
const ALBUM_KEY = (s: TealScrobble) =>
	s.releaseName ? `${s.releaseName}|||${s.artists.map((a) => a.name).join(',')}` : null;

/**
 * Normalise a scrobble's duration field to seconds.
 *
 * The fm.teal.alpha.feed.play lexicon defines `duration` as seconds,
 * but some scrobbling clients store milliseconds instead. A value
 * above 10 000 (≈ 2.7 hours) is almost certainly in milliseconds —
 * even the longest classical pieces rarely exceed 3 600 seconds.
 *
 * Returns 210 (3.5 minutes) as a fallback when absent.
 */
function normaliseDuration(raw: number | undefined): number {
	if (raw === undefined || raw === null) return 210;
	// Detect milliseconds: > 10 000 seconds is unreasonable for a single track
	if (raw > 10000) return Math.round(raw / 1000);
	// Cap at 1 hour — anything higher is noise
	return Math.min(raw, 3600);
}

/**
 * Incremental aggregator. Maintains running totals so it can be updated
 * as each batch of scrobbles arrives without reprocessing everything.
 */
export class Aggregator {
	private artistCounts = new Map<string, number>();
	private trackCounts = new Map<string, { name: string; artist: string; count: number }>();
	private albumCounts = new Map<string, { name: string; artist: string; count: number }>();
	private serviceOrigins = new Map<string, number>();
	private byHour = new Array(24).fill(0) as number[];
	private byDay = new Array(7).fill(0) as number[];
	private byHourDay = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);
	private dailyCounts = new Map<string, number>();
	private monthlyCounts = new Map<string, number>();
	private monthlyArtistCounts = new Map<string, Map<string, number>>();
	private firstListenMap = new Map<string, string>(); // artist → earliest YYYY-MM-DD
	private minutesCount = 0;
	private total = 0;

	add(scrobbles: TealScrobble[]): void {
		for (const scrobble of scrobbles) {
			// Validate timestamp first — malformed scrobbles are discarded entirely
			const date = new Date(scrobble.playedTime);
			if (isNaN(date.getTime())) continue;

			this.total++;

			const artistName = scrobble.artists[0]?.name ?? 'Unknown';
			this.artistCounts.set(artistName, (this.artistCounts.get(artistName) ?? 0) + 1);

			const trackKey = TRACK_KEY(scrobble);
			const existing = this.trackCounts.get(trackKey);
			if (existing) {
				existing.count++;
			} else {
				this.trackCounts.set(trackKey, {
					name: scrobble.trackName,
					artist: artistName,
					count: 1
				});
			}

			const albumKey = ALBUM_KEY(scrobble);
			if (albumKey) {
				const albumExisting = this.albumCounts.get(albumKey);
				if (albumExisting) {
					albumExisting.count++;
				} else {
					this.albumCounts.set(albumKey, {
						name: scrobble.releaseName!,
						artist: artistName,
						count: 1
					});
				}
			}

			// Duration (normalised to seconds → minutes; default 3.5 min if absent)
			this.minutesCount += normaliseDuration(scrobble.duration) / 60;
			const hour = date.getHours();
			const day = date.getDay();
			this.byHour[hour]++;
			this.byDay[day]++;
			this.byHourDay[day][hour]++;

			const dateKey = scrobble.playedTime.substring(0, 10); // YYYY-MM-DD
			this.dailyCounts.set(dateKey, (this.dailyCounts.get(dateKey) ?? 0) + 1);

			const monthKey = dateKey.substring(0, 7); // YYYY-MM
			this.monthlyCounts.set(monthKey, (this.monthlyCounts.get(monthKey) ?? 0) + 1);

			// Monthly artist plays
			let monthArtists = this.monthlyArtistCounts.get(monthKey);
			if (!monthArtists) {
				monthArtists = new Map<string, number>();
				this.monthlyArtistCounts.set(monthKey, monthArtists);
			}
			monthArtists.set(artistName, (monthArtists.get(artistName) ?? 0) + 1);

			// First listen per artist (keep the earliest date)
			const prevFirstListen = this.firstListenMap.get(artistName);
			if (!prevFirstListen || dateKey < prevFirstListen) {
				this.firstListenMap.set(artistName, dateKey);
			}

			if (scrobble.musicServiceBaseDomain) {
				const domain = scrobble.musicServiceBaseDomain;
				this.serviceOrigins.set(domain, (this.serviceOrigins.get(domain) ?? 0) + 1);
			}
		}
	}

	snapshot(): AggregatedData {
		const topArtists = [...this.artistCounts.entries()]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 50);

		const topTracks = [...this.trackCounts.values()]
			.sort((a, b) => b.count - a.count)
			.slice(0, 50);

		const topAlbums = [...this.albumCounts.values()]
			.sort((a, b) => b.count - a.count)
			.slice(0, 50);

		return {
			totalScrobbles: this.total,
			totalMinutes: Math.round(this.minutesCount),
			uniqueArtists: this.artistCounts.size,
			uniqueTracks: this.trackCounts.size,
			topArtists,
			topTracks,
			topAlbums,
			artistPlayCounts: this.artistCounts,
			trackPlayCounts: new Map([...this.trackCounts.values()].map((t) => [t.name, t.count])),
			albumPlayCounts: this.albumCounts,
			scrobblesByHour: [...this.byHour],
			scrobblesByDay: [...this.byDay],
			scrobblesByHourDay: this.byHourDay.map((d) => [...d]),
			dailyScrobbles: new Map(this.dailyCounts),
			monthlyScrobbles: new Map(this.monthlyCounts),
			artistFirstListen: this.firstListenMap,
			monthlyArtistPlays: this.monthlyArtistCounts,
			serviceOrigins: this.serviceOrigins
		};
	}
}

/** One-shot aggregation for when you have all scrobbles already. */
export function aggregate(scrobbles: TealScrobble[]): AggregatedData {
	const agg = new Aggregator();
	agg.add(scrobbles);
	return agg.snapshot();
}
