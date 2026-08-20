<script lang="ts">
	import BaseChart from '$lib/components/BaseChart.svelte';
	import { buildLetterDistribution } from '$lib/analysis/letter-distribution';

	let { names }: { names: string[] } = $props();

	const buckets = $derived(buildLetterDistribution(names));

	const config = $derived({
		type: 'bar' as const,
		data: {
			labels: buckets.map((b) => b.letter),
			datasets: [
				{
					label: 'Artists',
					data: buckets.map((b) => b.count),
					backgroundColor: '#fb71a4'
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
				y: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
			}
		}
	});
</script>

<div class="h-56 sm:h-64">
	<BaseChart {config} />
</div>
