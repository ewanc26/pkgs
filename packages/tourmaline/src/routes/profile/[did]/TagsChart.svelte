<script lang="ts">
	import { Tags } from '@lucide/svelte';
	import BaseChart from '$lib/components/BaseChart.svelte';
	import type { TagsProfile } from '$lib/analysis/tags-breakdown';

	let { tags }: { tags: TagsProfile } = $props();

	let mode = $state<'scrobbles' | 'artists'>('scrobbles');

	const active = $derived(mode === 'scrobbles' ? tags.byScrobbles : tags.byArtistCount);
	const top = $derived(active.slice(0, 15));

	const config = $derived({
		type: 'bar' as const,
		data: {
			labels: top.map((t) => t.name),
			datasets: [
				{
					label: mode === 'scrobbles' ? 'Scrobbles' : 'Artists',
					data: top.map((t) => t.weight),
					backgroundColor: '#fb7185'
				}
			]
		},
		options: {
			indexAxis: 'y' as const,
			responsive: true,
			maintainAspectRatio: false,
			animation: false as const,
			plugins: { legend: { display: false } },
			scales: {
				x: {
					ticks: { color: '#9ca3af', font: { size: 10 } },
					grid: { color: 'rgba(255,255,255,0.05)' }
				},
				y: {
					ticks: { color: '#e5e7eb', font: { size: 11 } },
					grid: { display: false }
				}
			}
		}
	});
</script>

{#if tags.byScrobbles.length > 0}
	<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
		<div class="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4">
			<div>
				<h2 class="text-base font-semibold sm:text-lg">Top Tags</h2>
				<p class="text-xs text-[var(--text-dim)]">
					Most common genre/tag strings across your library — unlike the categorised Genre
					Profile above, these are the raw tags themselves
				</p>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<Tags size={18} class="text-[var(--accent)]" />
				<div class="flex gap-1" role="radiogroup" aria-label="Tag weighting">
					<button
						class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {mode ===
						'scrobbles'
							? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
							: 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'}"
						onclick={() => (mode = 'scrobbles')}
						role="radio"
						aria-checked={mode === 'scrobbles'}
					>
						Scrobbles
					</button>
					<button
						class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {mode ===
						'artists'
							? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
							: 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'}"
						onclick={() => (mode = 'artists')}
						role="radio"
						aria-checked={mode === 'artists'}
					>
						Artists
					</button>
				</div>
			</div>
		</div>
		<div class="h-72 sm:h-96">
			<BaseChart {config} />
		</div>
	</div>
{/if}
