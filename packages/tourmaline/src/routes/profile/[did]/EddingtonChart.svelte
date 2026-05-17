<script lang="ts">
	import { Chart } from '$lib/chart';
	import type { DailyScrobble } from '$lib/types';

	let {
		dailyScrobbles = [],
		eddingtonNumber = 0
	}: {
		dailyScrobbles: DailyScrobble[];
		eddingtonNumber: number;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	/**
	 * Compute the frequency distribution: for each scrobble-count N,
	 * how many days had exactly N scrobbles.
	 * Adapted from lastfm-stats-web's EddingtonUtil.counts() and
	 * ScrobblePerDayChart.update().
	 */
	const dist = $derived.by(() => {
		const map = new Map<number, number>();
		for (const { count } of dailyScrobbles) {
			if (count <= 0) continue;
			map.set(count, (map.get(count) ?? 0) + 1);
		}
		const keys = [...map.keys()].sort((a, b) => a - b);
		return keys.map((k) => ({
			scrobbles: k,
			days: map.get(k)!,
			isEddington: k === eddingtonNumber
		}));
	});

	$effect(() => {
		if (!canvas || dist.length === 0) return;

		const labels = dist.map((d) => String(d.scrobbles));
		const data = dist.map((d) => d.days);
		const bgColors = dist.map((d) =>
			d.isEddington ? 'rgba(251,191,36,0.85)' : '#4ade80'
		);
		const borderColors = dist.map((d) =>
			d.isEddington ? '#f59e0b' : '#22c55e'
		);

		if (chart) {
			chart.data.labels = labels;
			chart.data.datasets[0].data = data;
			(chart.data.datasets[0] as any).backgroundColor = bgColors;
			(chart.data.datasets[0] as any).borderColor = borderColors;
			chart.update('none');
			return;
		}

		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						data,
						backgroundColor: bgColors,
						borderColor: borderColors,
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							title(items) {
								const n = items[0].label;
								return `${n} scrobble${n === '1' ? '' : 's'} per day`;
							},
							label(ctx) {
								const entry = dist[ctx.dataIndex];
								const dayStr = `${entry.days} day${entry.days !== 1 ? 's' : ''}`;
								if (entry.isEddington) {
									return [dayStr, `← Eddington number: ${eddingtonNumber}`];
								}
								return dayStr;
							}
						}
					}
				},
				scales: {
					x: {
						ticks: {
							color: '#e5e7eb',
							font: { size: 10 },
							maxRotation: 0,
							// Always show the Eddington bar label; thin out the rest
							callback(_, index) {
								const entry = dist[index];
								if (entry?.isEddington) return String(entry.scrobbles);
								return index % Math.max(1, Math.floor(dist.length / 20)) === 0
									? String(entry?.scrobbles ?? '')
									: '';
							}
						},
						grid: { display: false },
						title: {
							display: true,
							text: 'Scrobbles per day',
							color: '#6b7280',
							font: { size: 11 }
						}
					},
					y: {
						ticks: { color: '#9ca3af', font: { size: 10 } },
						grid: { color: 'rgba(255,255,255,0.05)' },
						title: {
							display: true,
							text: 'Number of days',
							color: '#6b7280',
							font: { size: 11 }
						}
					}
				}
			}
		});
	});
</script>

{#if eddingtonNumber > 0}
	<p class="mb-3 text-sm text-[var(--text-muted)]">
		Eddington number:
		<span class="font-semibold text-[var(--text)]">{eddingtonNumber}</span>
		<span class="text-[var(--text-dim)]">
			— {eddingtonNumber} days with at least {eddingtonNumber} scrobbles
		</span>
	</p>
{/if}

<div class="h-48 sm:h-64">
	<canvas bind:this={canvas}></canvas>
</div>
