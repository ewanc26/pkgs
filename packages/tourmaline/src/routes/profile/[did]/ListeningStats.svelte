<script lang="ts">
	import { Flame, TrendingUp, Calendar, Hash, Clock } from '@lucide/svelte';
	import type { DailyScrobble, Gap } from '$lib/types';

	let {
		dailyScrobbles = [],
		totalScrobbles = 0,
		longestGap = null
	}: {
		dailyScrobbles: DailyScrobble[];
		totalScrobbles: number;
		longestGap: Gap | null;
	} = $props();

	const stats = $derived.by(() => {
		if (dailyScrobbles.length === 0) {
			return { longestStreak: 0, currentStreak: 0, biggestDay: null, avgPerDay: 0, activeDays: 0 };
		}

		const sorted = [...dailyScrobbles].sort((a, b) => a.date.localeCompare(b.date));
		const dates = new Set(sorted.map((d) => d.date));

		// Longest streak
		let longestStreak = 0;
		let currentRun = 0;
		let prevDate: string | null = null;

		for (const { date } of sorted) {
			if (prevDate) {
				const prev = new Date(prevDate + 'T00:00:00Z');
				const curr = new Date(date + 'T00:00:00Z');
				const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
				if (diffDays === 1) {
					currentRun++;
				} else {
					longestStreak = Math.max(longestStreak, currentRun);
					currentRun = 1;
				}
			} else {
				currentRun = 1;
			}
			prevDate = date;
		}
		longestStreak = Math.max(longestStreak, currentRun);

		// Current streak (counting backwards from today)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		let currentStreak = 0;
		let checkDate = new Date(today);

		// If today has no scrobbles, start from yesterday
		const todayStr = today.toISOString().substring(0, 10);
		if (!dates.has(todayStr)) {
			checkDate.setDate(checkDate.getDate() - 1);
		}

		while (true) {
			const dateStr = checkDate.toISOString().substring(0, 10);
			if (dates.has(dateStr)) {
				currentStreak++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		}

		// Biggest day
		let biggestDay = sorted[0];
		for (const d of sorted) {
			if (d.count > biggestDay.count) biggestDay = d;
		}

		// Average per active day
		const activeDays = sorted.length;
		const avgPerDay = Math.round(totalScrobbles / Math.max(activeDays, 1));

		return { longestStreak, currentStreak, biggestDay, avgPerDay, activeDays };
	});

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00Z');
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}
	function formatGap(ms: number): string {
		const mins = Math.floor(ms / 60000);
		const hours = Math.floor(mins / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ${hours % 24}h`;
		if (hours > 0) return `${hours}h ${mins % 60}m`;
		return `${mins}m`;
	}
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
	<div class="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
		<div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
			<Flame size={12} class="text-orange-500" />
			Longest streak
		</div>
		<p class="mt-1 text-xl font-bold sm:text-2xl">
			{stats.longestStreak}<span class="text-sm text-[var(--text-muted)]"> days</span>
		</p>
	</div>

	<div class="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
		<div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
			<TrendingUp size={12} class="text-green-500" />
			Current streak
		</div>
		<p class="mt-1 text-xl font-bold sm:text-2xl">
			{stats.currentStreak}<span class="text-sm text-[var(--text-muted)]"> days</span>
		</p>
	</div>

	<div class="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
		<div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
			<Clock size={12} class="text-purple-400" />
			Longest silence
		</div>
		{#if longestGap}
			<p class="mt-1 text-xl font-bold sm:text-2xl">{formatGap(longestGap.durationMs)}</p>
			<p class="text-[10px] text-[var(--text-dim)]">{formatDate(longestGap.start.slice(0, 10))}</p>
		{:else}
			<p class="mt-1 text-xl font-bold sm:text-2xl">—</p>
		{/if}
	</div>

	<div class="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
		<div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
			<Calendar size={12} class="text-yellow-500" />
			Biggest day
		</div>
		<p class="mt-1 text-xl font-bold sm:text-2xl">{stats.biggestDay?.count ?? 0}</p>
		{#if stats.biggestDay}
			<p class="text-xs text-[var(--text-dim)]">{formatDate(stats.biggestDay.date)}</p>
		{/if}
	</div>

	<div class="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
		<div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
			<Hash size={12} class="text-blue-400" />
			Avg per active day
		</div>
		<p class="mt-1 text-xl font-bold sm:text-2xl">{stats.avgPerDay}</p>
		<p class="text-xs text-[var(--text-dim)]">{stats.activeDays} active days</p>
	</div>
</div>
