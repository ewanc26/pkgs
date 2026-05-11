import type { TealScrobble } from '$lib/types';

/** A contiguous listening session — scrobbles with ≤30 min gaps. */
export interface ListeningSession {
	startTime: string;
	endTime: string;
	scrobbleCount: number;
	estimatedMinutes: number;
}

export interface SessionStats {
	totalSessions: number;
	longestSession: ListeningSession | null;
	averageScrobblesPerSession: number;
	totalEstimatedMinutes: number;
	pattern: SessionPattern;
}

export type SessionPattern = 'night-owl' | 'commuter' | 'marathon' | 'snack' | 'balanced';

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Derive listening sessions from a sorted list of scrobbles.
 * A session is a contiguous sequence of scrobbles where each
 * consecutive pair is ≤30 minutes apart.
 */
export function deriveSessions(scrobbles: TealScrobble[]): ListeningSession[] {
	if (scrobbles.length === 0) return [];

	const sorted = [...scrobbles].sort(
		(a, b) => new Date(a.playedTime).getTime() - new Date(b.playedTime).getTime()
	);

	const sessions: ListeningSession[] = [];
	let sessionStart = sorted[0].playedTime;
	let sessionEnd = sorted[0].playedTime;
	let sessionCount = 1;

	for (let i = 1; i < sorted.length; i++) {
		const prev = new Date(sorted[i - 1].playedTime).getTime();
		const curr = new Date(sorted[i].playedTime).getTime();
		const gap = curr - prev;

		if (gap > SESSION_GAP_MS) {
			// Close current session
			sessions.push({
				startTime: sessionStart,
				endTime: sessionEnd,
				scrobbleCount: sessionCount,
				estimatedMinutes: estimateSessionMinutes(sorted, i - sessionCount, sessionCount)
			});
			// Start new session
			sessionStart = sorted[i].playedTime;
			sessionEnd = sorted[i].playedTime;
			sessionCount = 1;
		} else {
			sessionEnd = sorted[i].playedTime;
			sessionCount++;
		}
	}

	// Close last session
	sessions.push({
		startTime: sessionStart,
		endTime: sessionEnd,
		scrobbleCount: sessionCount,
		estimatedMinutes: estimateSessionMinutes(sorted, sorted.length - sessionCount, sessionCount)
	});

	return sessions;
}

/** Estimate minutes from the scrobbles in a session using average track duration. */
function estimateSessionMinutes(
	scrobbles: TealScrobble[],
	startIndex: number,
	count: number
): number {
	// Use the gap between first and last scrobble + average track duration
	if (count <= 1) return 3.5;

	const first = new Date(scrobbles[startIndex].playedTime).getTime();
	const last = new Date(scrobbles[startIndex + count - 1].playedTime).getTime();
	const spanMinutes = (last - first) / 60000;

	// Add ~3.5 minutes for the last track (it played after its timestamp)
	return Math.round(spanMinutes + 3.5);
}

/**
 * Build session stats from derived sessions.
 */
export function buildSessionStats(sessions: ListeningSession[]): SessionStats {
	if (sessions.length === 0) {
		return {
			totalSessions: 0,
			longestSession: null,
			averageScrobblesPerSession: 0,
			totalEstimatedMinutes: 0,
			pattern: 'balanced'
		};
	}

	let longest: ListeningSession | null = null;
	let totalScrobbles = 0;
	let totalMinutes = 0;

	for (const session of sessions) {
		totalScrobbles += session.scrobbleCount;
		totalMinutes += session.estimatedMinutes;
		if (!longest || session.scrobbleCount > longest.scrobbleCount) {
			longest = session;
		}
	}

	return {
		totalSessions: sessions.length,
		longestSession: longest,
		averageScrobblesPerSession: Math.round(totalScrobbles / sessions.length),
		totalEstimatedMinutes: totalMinutes,
		pattern: detectPattern(sessions)
	};
}

/**
 * Detect listening pattern from session timing.
 *
 * - night-owl: >50% of sessions start 22:00–05:00
 * - commuter: >40% of sessions start 07:00–09:00 or 17:00–19:00, and sessions are short
 * - marathon: longest session >3 hours, and >20% of sessions are >2 hours
 * - snack: >60% of sessions have ≤3 scrobbles
 * - balanced: default
 */
function detectPattern(sessions: ListeningSession[]): SessionPattern {
	if (sessions.length < 5) return 'balanced';

	let nightCount = 0;
	let commuteCount = 0;
	let marathonCount = 0;
	let snackCount = 0;

	for (const session of sessions) {
		const startHour = new Date(session.startTime).getHours();

		if (startHour >= 22 || startHour < 5) nightCount++;
		if ((startHour >= 7 && startHour <= 9) || (startHour >= 17 && startHour <= 19)) commuteCount++;
		if (session.estimatedMinutes >= 120) marathonCount++;
		if (session.scrobbleCount <= 3) snackCount++;
	}

	const total = sessions.length;

	if (nightCount / total >= 0.5) return 'night-owl';
	if (commuteCount / total >= 0.4 && sessions.filter((s) => s.estimatedMinutes <= 90).length / total >= 0.5) return 'commuter';
	if (marathonCount / total >= 0.2) return 'marathon';
	if (snackCount / total >= 0.6) return 'snack';

	return 'balanced';
}
