<script lang="ts">
	import { CalendarDays } from '@lucide/svelte';
	import type { DailyScrobble } from '$lib/types';

	let {
		dailyScrobbles,
		weeklyScrobbles
	}: {
		dailyScrobbles: DailyScrobble[];
		weeklyScrobbles: Array<{ week: string; count: number }>;
	} = $props();

	const topDays = $derived([...dailyScrobbles].sort((a, b) => b.count - a.count).slice(0, 10));
	const topWeeks = $derived([...weeklyScrobbles].sort((a, b) => b.count - a.count).slice(0, 10));

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatWeek(weekKey: string): string {
		const [year, week] = weekKey.split('-W');
		return `Week ${week}, ${year}`;
	}
</script>

{#if topDays.length > 0 || topWeeks.length > 0}
	<div class="mb-6 grid gap-4 sm:mb-8 sm:gap-8 lg:grid-cols-2">
		{#if topDays.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<h2 class="text-base font-semibold sm:text-lg">Biggest Days</h2>
					<div class="shrink-0 text-[var(--accent)]"><CalendarDays size={18} /></div>
				</div>
				<ol class="space-y-2">
					{#each topDays as day, i (day.date)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">{formatDate(day.date)}</span>
							<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{day.count.toLocaleString()}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}

		{#if topWeeks.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<h2 class="text-base font-semibold sm:text-lg">Biggest Weeks</h2>
					<div class="shrink-0 text-[var(--accent)]"><CalendarDays size={18} /></div>
				</div>
				<ol class="space-y-2">
					{#each topWeeks as week, i (week.week)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">{formatWeek(week.week)}</span>
							<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{week.count.toLocaleString()}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>
{/if}
