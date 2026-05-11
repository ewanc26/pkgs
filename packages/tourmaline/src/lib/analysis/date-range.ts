import type { TealScrobble } from '$lib/types';

export type DateRangePreset = '7d' | '30d' | '90d' | '365d' | 'all';

export interface DateRange {
	start: string; // YYYY-MM-DD
	end: string;   // YYYY-MM-DD
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
	'7d': '7 days',
	'30d': '30 days',
	'90d': '90 days',
	'365d': '365 days',
	all: 'All time'
};

export { PRESET_LABELS };

/**
 * Compute start/end dates for a preset range.
 * End is always today. Start is computed backwards.
 */
export function presetRange(preset: DateRangePreset): DateRange {
	if (preset === 'all') {
		// Far enough back to include everything
		return { start: '2000-01-01', end: '2099-12-31' };
	}

	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

	const days: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
	const start = new Date(now);
	start.setDate(start.getDate() - days[preset]);

	return {
		start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
		end
	};
}

/**
 * Filter scrobbles to those within a date range (inclusive).
 * Compares against the date portion of playedTime.
 */
export function filterScrobbles(scrobbles: TealScrobble[], range: DateRange): TealScrobble[] {
	return scrobbles.filter((s) => {
		const date = s.playedTime.substring(0, 10);
		return date >= range.start && date <= range.end;
	});
}

/**
 * Check if a preset range would meaningfully differ from 'all'.
 * Returns false if the user has no scrobbles in the range.
 */
export function hasScrobblesInRange(scrobbles: TealScrobble[], preset: DateRangePreset): boolean {
	if (preset === 'all') return scrobbles.length > 0;
	const range = presetRange(preset);
	return scrobbles.some((s) => {
		const date = s.playedTime.substring(0, 10);
		return date >= range.start && date <= range.end;
	});
}
