<script lang="ts">
	import type { DailyScrobble } from '$lib/types';

	let { dailyScrobbles = [] }: { dailyScrobbles: DailyScrobble[] } = $props();

	const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	const countMap = $derived(new Map(dailyScrobbles.map((d) => [d.date, d.count])));
	const maxCount = $derived(Math.max(...dailyScrobbles.map((d) => d.count), 1));

	// Build a flat list of cells for 365 days ending today
	interface Cell {
		date: string;
		count: number; // -1 = future
		month: number;
	}

	const cells = $derived.by(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const todayDow = today.getDay();
		const thisSunday = new Date(today);
		thisSunday.setDate(thisSunday.getDate() - todayDow);

		const startSunday = new Date(thisSunday);
		startSunday.setDate(startSunday.getDate() - 52 * 7);

		const result: Cell[] = [];
		let current = new Date(startSunday);
		const end = new Date(thisSunday);
		end.setDate(end.getDate() + 7); // include the current week

		while (current < end) {
			if (current > today) {
				result.push({ date: '', count: -1, month: 0 });
			} else {
				const dateStr = current.toISOString().substring(0, 10);
				result.push({
					date: dateStr,
					count: countMap.get(dateStr) ?? 0,
					month: current.getMonth()
				});
			}
			current.setDate(current.getDate() + 1);
		}

		return result;
	});

	// Month labels: figure out which week (column) each month starts at
	const monthLabels = $derived.by(() => {
		const labels: { col: number; label: string }[] = [];
		let lastMonth = -1;

		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];
			if (cell.count >= 0 && cell.month !== lastMonth) {
				const col = Math.floor(i / 7);
				labels.push({ col, label: monthNames[cell.month] });
				lastMonth = cell.month;
			}
		}

		return labels;
	});

	function cellColour(count: number): string {
		if (count < 0) return '';
		if (count === 0) return 'bg-empty';
		const intensity = count / maxCount;
		if (intensity > 0.75) return 'bg-hot';
		if (intensity > 0.5) return 'bg-med';
		if (intensity > 0.25) return 'bg-low';
		return 'bg-dim';
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		const d = new Date(dateStr + 'T00:00:00Z');
		return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<div class="w-full overflow-x-auto">
	<div class="graph">
		<!-- Month labels row -->
		<div class="month-labels">
			{#each monthLabels as label}
				<div class="month-label" style="grid-column: {label.col + 1};">
					{label.label}
				</div>
			{/each}
		</div>

		<!-- Day labels + cells row -->
		<div class="day-labels">
			{#each dayLabels as day}
				<div>{day}</div>
			{/each}
		</div>

		<div class="squares">
			{#each cells as cell}
				<div
					class="square {cellColour(cell.count)}"
					title={cell.date ? `${formatDate(cell.date)} — ${cell.count} scrobble${cell.count !== 1 ? 's' : ''}` : ''}
				></div>
			{/each}
		</div>
	</div>
</div>

<style>
	.graph {
		display: inline-grid;
		grid-template-areas:
			"empty months"
			"days squares";
		grid-template-columns: auto 1fr;
		gap: 4px;
	}

	@media (min-width: 640px) {
		.graph {
			gap: 6px;
		}
	}

	.month-labels {
		grid-area: months;
		display: grid;
		grid-template-columns: repeat(53, 1fr);
		gap: 0;
	}

	.month-label {
		font-size: 0.625rem;
		color: var(--text-muted);
	}

	@media (min-width: 640px) {
		.month-label {
			font-size: 0.75rem;
		}
	}

	.day-labels {
		grid-area: days;
		display: grid;
		grid-template-rows: repeat(7, 1fr);
		gap: 2px;
	}

	@media (min-width: 640px) {
		.day-labels {
			gap: 3px;
		}
	}

	.day-labels div {
		display: flex;
		align-items: center;
		font-size: 0.625rem;
		color: var(--text-muted);
		height: 0.75rem;
	}

	@media (min-width: 640px) {
		.day-labels div {
			font-size: 0.75rem;
			height: 1rem;
		}
	}

	.squares {
		grid-area: squares;
		display: grid;
		grid-template-rows: repeat(7, 0.75rem);
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 2px;
	}

	@media (min-width: 640px) {
		.squares {
			grid-template-rows: repeat(7, 1rem);
			gap: 3px;
		}
	}

	.square {
		border-radius: 0.125rem;
	}

	/* Heatmap colours — green to pink gradient (tourmaline pleochroism) */
	.square.bg-empty {
		background-color: var(--surface-2);
	}

	.square.bg-dim {
		background-color: #15803d;
	}

	.square.bg-low {
		background-color: #16a34a;
	}

	.square.bg-med {
		background-color: var(--accent-dim);
	}

	.square.bg-hot {
		background-color: var(--accent);
	}
</style>
