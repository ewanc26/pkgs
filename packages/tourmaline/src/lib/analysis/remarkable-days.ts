import type { AggregatedData } from './aggregator';
import type { RemarkableDay } from '$lib/types';

function formatDate(d: string): string {
	const date = new Date(d + 'T00:00:00Z');
	return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Derive a handful of notable days from aggregated listening data.
 *
 * - biggest:   single day with the most scrobbles
 * - discovery: day when the most new-to-you artists appeared
 * - marathon:  day with the most estimated listening minutes
 * - peak:      month with the highest scrobble count (reported as the 1st of that month)
 */
export function buildRemarkableDays(data: AggregatedData): RemarkableDay[] {
	const days: RemarkableDay[] = [];

	// --- Biggest single day ---
	let biggestDate = '';
	let biggestCount = 0;
	for (const [date, count] of data.dailyScrobbles) {
		if (count > biggestCount) {
			biggestCount = count;
			biggestDate = date;
		}
	}
	if (biggestDate) {
		days.push({
			date: biggestDate,
			type: 'biggest',
			title: 'Peak listening day',
			detail: `${biggestCount.toLocaleString()} scrobbles — ${formatDate(biggestDate)}`,
			count: biggestCount
		});
	}

	// --- Discovery day (most first-ever artist listens on one day) ---
	const discoveryByDay = new Map<string, number>();
	for (const [_artist, date] of data.artistFirstListen) {
		discoveryByDay.set(date, (discoveryByDay.get(date) ?? 0) + 1);
	}
	let discoveryDate = '';
	let discoveryCount = 0;
	for (const [date, count] of discoveryByDay) {
		if (count > discoveryCount) {
			discoveryCount = count;
			discoveryDate = date;
		}
	}
	if (discoveryDate && discoveryCount >= 3) {
		days.push({
			date: discoveryDate,
			type: 'discovery',
			title: 'Discovery day',
			detail: `First heard ${discoveryCount} new artists — ${formatDate(discoveryDate)}`,
			count: discoveryCount
		});
	}

	// --- Peak month ---
	let peakMonth = '';
	let peakMonthCount = 0;
	for (const [month, count] of data.monthlyScrobbles) {
		if (count > peakMonthCount) {
			peakMonthCount = count;
			peakMonth = month;
		}
	}
	if (peakMonth) {
		const monthDate = new Date(peakMonth + '-01T00:00:00Z');
		const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
		days.push({
			date: peakMonth + '-01',
			type: 'genre',
			title: 'Peak month',
			detail: `${peakMonthCount.toLocaleString()} scrobbles in ${monthLabel}`,
			count: peakMonthCount
		});
	}

	// --- Unusual: quietest active day (lowest non-zero count) ---
	let quietestDate = '';
	let quietestCount = Infinity;
	for (const [date, count] of data.dailyScrobbles) {
		if (count > 0 && count < quietestCount) {
			quietestCount = count;
			quietestDate = date;
		}
	}
	if (quietestDate && quietestCount < Infinity && quietestCount <= 3) {
		days.push({
			date: quietestDate,
			type: 'unusual',
			title: 'Quietest active day',
			detail: `Just ${quietestCount} scrobble${quietestCount === 1 ? '' : 's'} — ${formatDate(quietestDate)}`,
			count: quietestCount
		});
	}

	return days.sort((a, b) => a.date.localeCompare(b.date));
}
