<script lang="ts">
	/**
	 * Detail modal for a single row clicked in the dataset explorer
	 * (Dataset.svelte). Shows animated stat tiles for every category, plus
	 * an artist-only rank-over-time chart — tracks/albums don't have a
	 * per-month rank history in this codebase (see rank-history.ts).
	 */
	import { X } from '@lucide/svelte';
	import type { RankSnapshot } from '$lib/analysis/rank-history';
	import CountUp from './CountUp.svelte';
	import DatasetRankChart from './DatasetRankChart.svelte';

	export type DatasetCategory = 'artists' | 'tracks' | 'albums';
	export interface DatasetRow {
		rank: number;
		name: string;
		artist?: string;
		count: number;
	}

	let {
		row,
		category,
		artistRankHistory,
		topArtistsByWeeksActive,
		monthlyArtistPlays,
		onClose
	}: {
		row: DatasetRow;
		category: DatasetCategory;
		artistRankHistory: Array<[string, RankSnapshot[]]>;
		topArtistsByWeeksActive: Array<{ name: string; weeksActive: number; count: number }>;
		monthlyArtistPlays: Array<[string, Array<[string, number]>]>;
		onClose: () => void;
	} = $props();

	const isArtist = $derived(category === 'artists');

	const history = $derived.by((): RankSnapshot[] => {
		if (!isArtist) return [];
		return artistRankHistory.find(([name]) => name === row.name)?.[1] ?? [];
	});

	const weeksActive = $derived.by((): number | null => {
		if (!isArtist) return null;
		return topArtistsByWeeksActive.find((a) => a.name === row.name)?.weeksActive ?? null;
	});

	const bestRank = $derived(history.length > 0 ? Math.min(...history.map((h) => h.rank)) : null);

	const bestMonth = $derived.by((): number | null => {
		if (!isArtist) return null;
		let best = 0;
		for (const [, artists] of monthlyArtistPlays) {
			for (const [name, count] of artists) {
				if (name === row.name && count > best) best = count;
			}
		}
		return best > 0 ? best : null;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Enter' && onClose()}
	role="button"
	tabindex="-1"
>
	<div
		class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="dataset-modal-title"
		tabindex="-1"
	>
		<div class="mb-4 flex items-start justify-between gap-4">
			<div class="min-w-0">
				<h2 id="dataset-modal-title" class="truncate text-lg font-semibold sm:text-xl">{row.name}</h2>
				{#if row.artist}
					<p class="truncate text-sm text-[var(--text-muted)]">{row.artist}</p>
				{/if}
			</div>
			<button
				onclick={onClose}
				class="shrink-0 rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
				aria-label="Close"
			>
				<X size={20} />
			</button>
		</div>

		<div class="mb-4 grid grid-cols-2 gap-3 sm:gap-4">
			<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] p-3">
				<p class="text-xs text-[var(--text-dim)]">Total scrobbles</p>
				<p class="text-xl font-semibold text-[var(--accent)] sm:text-2xl">
					<CountUp value={row.count} />
				</p>
			</div>

			{#if isArtist && weeksActive !== null}
				<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] p-3">
					<p class="text-xs text-[var(--text-dim)]">Weeks active</p>
					<p class="text-xl font-semibold text-[var(--accent)] sm:text-2xl">
						<CountUp value={weeksActive} />
					</p>
				</div>
			{/if}

			{#if isArtist && bestRank !== null}
				<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] p-3">
					<p class="text-xs text-[var(--text-dim)]">Best rank ever</p>
					<p class="text-xl font-semibold text-[var(--accent)] sm:text-2xl">
						#<CountUp value={bestRank} />
					</p>
				</div>
			{/if}

			{#if isArtist && bestMonth !== null}
				<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] p-3">
					<p class="text-xs text-[var(--text-dim)]">Best month</p>
					<p class="text-xl font-semibold text-[var(--accent)] sm:text-2xl">
						<CountUp value={bestMonth} />
					</p>
				</div>
			{/if}
		</div>

		{#if isArtist && history.length > 0}
			<div>
				<h3 class="mb-2 text-sm font-medium text-[var(--text-muted)]">Rank over time</h3>
				<DatasetRankChart {history} />
			</div>
		{/if}
	</div>
</div>
