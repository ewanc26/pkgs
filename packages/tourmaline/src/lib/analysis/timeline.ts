import type { AggregatedData } from './aggregator';
import type { TimelineBucket } from '$lib/types';

export function buildTimeline(data: AggregatedData): TimelineBucket[] {
	const buckets: TimelineBucket[] = [];

	for (let day = 0; day < 7; day++) {
		for (let hour = 0; hour < 24; hour++) {
			buckets.push({
				hour,
				day,
				count: data.scrobblesByHourDay[day][hour]
			});
		}
	}

	return buckets;
}

export function getPeakHour(data: AggregatedData): { hour: number; count: number } {
	let maxHour = 0;
	let maxCount = 0;

	for (let h = 0; h < 24; h++) {
		if (data.scrobblesByHour[h] > maxCount) {
			maxCount = data.scrobblesByHour[h];
			maxHour = h;
		}
	}

	return { hour: maxHour, count: maxCount };
}

export function getPeakDay(data: AggregatedData): { day: number; count: number } {
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	let maxDay = 0;
	let maxCount = 0;

	for (let d = 0; d < 7; d++) {
		if (data.scrobblesByDay[d] > maxCount) {
			maxCount = data.scrobblesByDay[d];
			maxDay = d;
		}
	}

	return { day: maxDay, count: maxCount };
}

export function formatHour(hour: number): string {
	return `${hour.toString().padStart(2, '0')}:00`;
}

export function formatDay(day: number): string {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return days[day];
}
