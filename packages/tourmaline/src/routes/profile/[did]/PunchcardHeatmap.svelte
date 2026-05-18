<script lang="ts">
	import type { TimelineBucket } from '$lib/types';

	let { timeline = [] }: { timeline: TimelineBucket[] } = $props();

	// JS Date.getDay() returns 0=Sun … 6=Sat; we shift it to start on Mon.
	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

	// Build [day][hour] lookup grid
	const grid = $derived.by(() => {
		const g: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
		for (const b of timeline) {
			if (b.day >= 0 && b.day < 7 && b.hour >= 0 && b.hour < 24) {
				// Shift Sunday (0) to index 6, Monday (1) to index 0, etc.
				const shiftedDay = (b.day + 6) % 7;
				g[shiftedDay][b.hour] = b.count;
			}
		}
		return g;
	});

	const maxCount = $derived(Math.max(...timeline.map((b) => b.count), 1));

	function intensity(count: number): string {
		if (count === 0) return 'bg-empty';
		const r = count / maxCount;
		if (r > 0.75) return 'bg-hot';
		if (r > 0.5) return 'bg-med';
		if (r > 0.25) return 'bg-low';
		return 'bg-dim';
	}
</script>

<div class="overflow-x-auto">
	<div class="punchcard">
		<!-- Top-left corner spacer -->
		<div></div>

		<!-- Hour labels (every 3 hours to avoid crowding) -->
		{#each HOURS as hour, h}
			<div class="hour-label">
				{h % 3 === 0 ? hour.slice(0, 2) : ''}
			</div>
		{/each}

		<!-- One row per day -->
		{#each DAYS as day, d}
			<div class="day-label">{day}</div>
			{#each { length: 24 } as _, h}
				{@const count = grid[d][h]}
				<div
					class="cell {intensity(count)}"
					title="{day} {HOURS[h]} — {count.toLocaleString()} scrobble{count !== 1 ? 's' : ''}"
				></div>
			{/each}
		{/each}
	</div>
</div>

<style>
	.punchcard {
		display: grid;
		/* day-label column + 24 hour columns */
		grid-template-columns: 2.5rem repeat(24, 1fr);
		gap: 2px;
		min-width: 380px;
	}

	.hour-label {
		font-size: 0.6rem;
		color: var(--text-dim);
		text-align: center;
		padding-bottom: 2px;
		line-height: 1;
	}

	.day-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
	}

	.cell {
		aspect-ratio: 1;
		border-radius: 2px;
		min-height: 0.7rem;
		cursor: default;
		transition: opacity 0.1s;
	}

	.cell:hover {
		opacity: 0.75;
	}

	/* Reuse the same palette as TimelineHeatmap */
	.bg-empty { background-color: var(--surface-2); }
	.bg-dim   { background-color: #15803d; }
	.bg-low   { background-color: #16a34a; }
	.bg-med   { background-color: var(--accent-dim); }
	.bg-hot   { background-color: var(--accent); }
</style>
