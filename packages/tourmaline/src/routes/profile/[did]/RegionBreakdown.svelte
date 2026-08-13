<script lang="ts">
	import { Globe } from '@lucide/svelte';
	import type { RegionProfile } from '$lib/analysis/region-breakdown';

	let { regions }: { regions: RegionProfile } = $props();

	let mode = $state<'scrobbles' | 'artists'>('scrobbles');

	const active = $derived(mode === 'scrobbles' ? regions.byScrobbles : regions.byArtistCount);
	const top = $derived(active.slice(0, 12));
	const total = $derived(active.reduce((sum, r) => sum + r.weight, 0));

	/** ISO 3166-1 alpha-2 -> flag emoji (regional indicator symbols). */
	function flagEmoji(code?: string): string | null {
		if (!code || code.length !== 2) return null;
		const upper = code.toUpperCase();
		const codePoints = [...upper].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
		if (codePoints.some((cp) => cp < 0x1f1e6 || cp > 0x1f1ff)) return null;
		return String.fromCodePoint(...codePoints);
	}
</script>

{#if regions.byScrobbles.length > 0}
	<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
		<div class="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4">
			<div>
				<h2 class="text-base font-semibold sm:text-lg">Artists by Region</h2>
				<p class="text-xs text-[var(--text-dim)]">
					Country/region of origin (MusicBrainz), for artists that resolved one
				</p>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<Globe size={18} class="text-[var(--accent)]" />
				<div class="flex gap-1" role="radiogroup" aria-label="Region weighting">
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
		<ol class="space-y-2">
			{#each top as region, i (region.area)}
				{@const pct = total > 0 ? Math.round((region.weight / total) * 100) : 0}
				<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
					<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm"
						>{i + 1}</span
					>
					{#if flagEmoji(region.areaCode)}
						<span class="shrink-0" aria-hidden="true">{flagEmoji(region.areaCode)}</span>
					{/if}
					<span class="min-w-0 shrink truncate">{region.area}</span>
					<span class="ml-auto shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm"
						>{region.weight.toLocaleString()} ({pct}%)</span
					>
				</li>
			{/each}
		</ol>
	</div>
{/if}
