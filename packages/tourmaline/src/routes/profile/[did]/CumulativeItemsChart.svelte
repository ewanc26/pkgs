<script lang="ts">
	import { Chart } from '$lib/chart';
	import type { ListenerProfile } from '$lib/types';

	let {
		monthlyArtistPlays = [],
		topArtists = []
	}: {
		monthlyArtistPlays: ListenerProfile['monthlyArtistPlays'];
		topArtists: ListenerProfile['topArtists'];
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	// Two-hue palette, cycled: the brand rose and its green counterpart,
	// stepped by lightness so ten series stay separable without a rainbow.
	const PALETTE = [
		'#ee96a3', // rose 0
		'#a0e3bc', // green 0
		'#e87384', // rose 1
		'#81daa6', // green 1
		'#e25066', // rose 2
		'#61d190', // green 2
		'#dd2c47', // rose 3
		'#41c879', // green 3
		'#c11f38', // rose 4
		'#32ae66' // green 4
	];

	/**
	 * For the top 10 artists (by total play count), compute their running
	 * cumulative scrobble total across the full monthly timeline.
	 */
	const series = $derived.by(() => {
		const months = [...monthlyArtistPlays].sort((a, b) => a[0].localeCompare(b[0]));
		const labels = months.map(([month]) => month);

		const top10 = topArtists.slice(0, 10);
		const datasets = top10.map((artist, i) => {
			let running = 0;
			const data = months.map(([, plays]) => {
				const entry = plays.find(([name]) => name === artist.name);
				running += entry ? entry[1] : 0;
				return running;
			});
			const colour = PALETTE[i % PALETTE.length];
			return { name: artist.name, data, colour };
		});

		return { labels, datasets };
	});

	$effect(() => {
		if (!canvas || series.labels.length === 0 || series.datasets.length === 0) return;

		const chartDatasets = series.datasets.map((d) => ({
			label: d.name,
			data: d.data,
			borderColor: d.colour,
			backgroundColor: d.colour,
			pointRadius: 0,
			borderWidth: 2,
			tension: 0.15
		}));

		if (chart) {
			chart.data.labels = series.labels;
			chart.data.datasets = chartDatasets;
			chart.update('none');
			return;
		}

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: series.labels,
				datasets: chartDatasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				interaction: { mode: 'nearest', axis: 'x', intersect: false },
				plugins: {
					legend: {
						display: true,
						labels: { color: '#9ca3af', font: { size: 10 }, boxWidth: 12 }
					},
					tooltip: { mode: 'nearest', axis: 'x', intersect: false }
				},
				scales: {
					x: {
						ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 0, autoSkip: true },
						grid: { display: false }
					},
					y: {
						ticks: { color: '#9ca3af', font: { size: 10 } },
						grid: { color: 'rgba(255,255,255,0.05)' },
						title: {
							display: true,
							text: 'Cumulative scrobbles',
							color: '#6b7280',
							font: { size: 11 }
						}
					}
				}
			}
		});
	});
</script>

<div class="h-64 sm:h-80">
	<canvas bind:this={canvas}></canvas>
</div>
