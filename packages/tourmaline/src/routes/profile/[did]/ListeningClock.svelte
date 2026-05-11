<script lang="ts">
	import { Chart } from '$lib/chart';

	let { scrobblesByHour = [] }: { scrobblesByHour: number[] } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

	$effect(() => {
		if (!canvas || scrobblesByHour.length === 0) return;

		const values = scrobblesByHour.slice();
		const isMobile = canvas.clientWidth < 400;

		if (chart) {
			chart.data.datasets[0].data = values;
			const rScale = chart.options.scales?.r as { pointLabels?: { font?: { size?: number } } } | undefined;
			if (rScale?.pointLabels?.font) {
				rScale.pointLabels.font.size = isMobile ? 7 : 9;
			}
			chart.update();
			return;
		}

		chart = new Chart(canvas, {
			type: 'radar',
			data: {
				labels: HOURS,
				datasets: [
					{
						data: values,
						backgroundColor: 'rgba(74, 222, 128, 0.12)',
						borderColor: 'rgba(74, 222, 128, 0.5)',
						pointBackgroundColor: 'rgba(74, 222, 128, 0.7)',
						pointRadius: 2,
						borderWidth: 1.5
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
							label: (ctx) => `${ctx.raw} scrobbles`
						}
					}
				},
				scales: {
					r: {
						beginAtZero: true,
						ticks: {
							color: '#6b7280',
							backdropColor: 'transparent',
							font: { size: 8 },
							maxTicksLimit: 4
						},
						grid: { color: 'rgba(255,255,255,0.06)' },
						pointLabels: {
							color: '#9ca3af',
							font: { size: isMobile ? 7 : 9 }
						},
						angleLines: { color: 'rgba(255,255,255,0.06)' }
					}
				}
			}
		});
	});
</script>

<div class="h-64 sm:h-80">
	<canvas bind:this={canvas}></canvas>
</div>
