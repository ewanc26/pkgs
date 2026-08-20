<script lang="ts">
	/**
	 * Rank-over-time line chart for one artist, used inside the dataset
	 * explorer's item detail modal. Y-axis is reversed since a lower rank
	 * number (#1, #2, ...) is "better".
	 */
	import { onDestroy } from 'svelte';
	import { Chart } from '$lib/chart';
	import type { RankSnapshot } from '$lib/analysis/rank-history';

	let { history }: { history: RankSnapshot[] } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	$effect(() => {
		if (!canvas || history.length === 0) return;

		const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
		const labels = sorted.map((h) => h.month);
		const data = sorted.map((h) => h.rank);

		if (chart) {
			chart.data.labels = labels;
			chart.data.datasets[0].data = data;
			chart.update('none');
			return;
		}

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						data,
						borderColor: '#fb71a4',
						backgroundColor: 'rgba(74,222,128,0.15)',
						fill: true,
						tension: 0.2,
						pointRadius: 2
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
							label(ctx) {
								return `Rank #${ctx.parsed.y}`;
							}
						}
					}
				},
				scales: {
					x: {
						ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 0 },
						grid: { display: false }
					},
					y: {
						reverse: true,
						ticks: { color: '#9ca3af', font: { size: 10 }, precision: 0 },
						grid: { color: 'rgba(255,255,255,0.05)' },
						title: {
							display: true,
							text: 'Rank (lower is better)',
							color: '#6b7280',
							font: { size: 11 }
						}
					}
				}
			}
		});
	});

	onDestroy(() => chart?.destroy());
</script>

<div class="h-48 sm:h-56">
	<canvas bind:this={canvas}></canvas>
</div>
