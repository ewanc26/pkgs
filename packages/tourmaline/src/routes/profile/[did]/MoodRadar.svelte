<script lang="ts">
	import { Chart } from '$lib/chart';

	let { mood = {} }: { mood: Record<string, number> } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	$effect(() => {
		if (!canvas) return;

		const labels = Object.keys(mood);
		const values = Object.values(mood);
		const isMobile = canvas.clientWidth < 400;

		if (chart) {
			chart.data.labels = labels;
			chart.data.datasets[0].data = values;
			// Type-safe update: pointLabels is a radar scale property
			const rScale = chart.options.scales?.r as { pointLabels?: { font?: { size?: number } } } | undefined;
			if (rScale?.pointLabels?.font) {
				rScale.pointLabels.font.size = isMobile ? 9 : 11;
			}
			chart.update();
			return;
		}

		chart = new Chart(canvas, {
			type: 'radar',
			data: {
				labels,
				datasets: [
					{
						data: values,
						backgroundColor: 'rgba(74, 222, 128, 0.15)',
						borderColor: 'rgba(74, 222, 128, 0.6)',
						pointBackgroundColor: 'rgba(74, 222, 128, 0.9)'
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
					r: {
						beginAtZero: true,
						max: 100,
						ticks: { color: '#9ca3af', backdropColor: 'transparent', font: { size: 10 } },
						grid: { color: 'rgba(255,255,255,0.1)' },
						pointLabels: { color: '#e5e7eb', font: { size: isMobile ? 9 : 11 } },
						angleLines: { color: 'rgba(255,255,255,0.1)' }
					}
				}
			}
		});
	});
</script>

<div class="h-64 sm:h-80">
	<canvas bind:this={canvas}></canvas>
</div>
