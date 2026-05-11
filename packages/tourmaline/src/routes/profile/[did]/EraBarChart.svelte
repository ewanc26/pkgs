<script lang="ts">
	import { Chart } from '$lib/chart';
	import type { EraEntry } from '$lib/types';

	let { era = [] }: { era: EraEntry[] } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = $state(null);

	const BAR_COLOUR = '#4ade80';

	$effect(() => {
		if (!canvas || era.length === 0) return;

		if (chart) {
			chart.data.labels = era.map((e) => e.decade);
			chart.data.datasets[0].data = era.map((e) => e.count);
			chart.data.datasets[0].backgroundColor = era.map(() => BAR_COLOUR);
			chart.update('none');
			return;
		}

		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: era.map((e) => e.decade),
				datasets: [
					{
						data: era.map((e) => e.count),
						backgroundColor: era.map(() => BAR_COLOUR)
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				plugins: {
					legend: { display: false }
				},
				scales: {
					x: {
						ticks: { color: '#e5e7eb' },
						grid: { display: false }
					},
					y: {
						ticks: { color: '#9ca3af' },
						grid: { color: 'rgba(255,255,255,0.05)' }
					}
				}
			}
		});
	});
</script>

<div class="h-48 sm:h-64">
	<canvas bind:this={canvas}></canvas>
</div>
