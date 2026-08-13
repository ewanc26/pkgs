<script lang="ts">
	/**
	 * Sortable, searchable dataset explorer over the top-50 artists/tracks/
	 * albums, with CSV export and a per-item detail modal. Ported (in
	 * spirit) from lastfm-stats-web's dataset table — scoped down to the
	 * aggregator's top-50 cap rather than the full listening history, since
	 * lifting that cap needs aggregator.ts changes out of scope here.
	 */
	import { Table2, Search, ArrowUp, ArrowDown, ArrowUpDown, Download } from '@lucide/svelte';
	import type { RankSnapshot } from '$lib/analysis/rank-history';
	import DatasetItemModal, { type DatasetCategory, type DatasetRow } from './DatasetItemModal.svelte';

	let {
		topArtists,
		topTracks,
		topAlbums,
		artistRankHistory,
		topArtistsByWeeksActive,
		monthlyArtistPlays
	}: {
		topArtists: Array<{ name: string; count: number; imageUrl?: string }>;
		topTracks: Array<{ name: string; artist: string; count: number }>;
		topAlbums: Array<{ name: string; artist: string; count: number }>;
		artistRankHistory: Array<[string, RankSnapshot[]]>;
		topArtistsByWeeksActive: Array<{ name: string; weeksActive: number; count: number }>;
		monthlyArtistPlays: Array<[string, Array<[string, number]>]>;
	} = $props();

	const CATEGORIES: Array<{ id: DatasetCategory; label: string }> = [
		{ id: 'artists', label: 'Artists' },
		{ id: 'tracks', label: 'Tracks' },
		{ id: 'albums', label: 'Albums' }
	];

	type SortKey = 'rank' | 'name' | 'artist' | 'count';

	let category = $state<DatasetCategory>('artists');
	let search = $state('');
	let sortKey = $state<SortKey>('rank');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let selected = $state<DatasetRow | null>(null);

	const baseRows = $derived.by((): DatasetRow[] => {
		if (category === 'artists') {
			return topArtists.map((a, i) => ({ rank: i + 1, name: a.name, count: a.count }));
		}
		if (category === 'tracks') {
			return topTracks.map((t, i) => ({ rank: i + 1, name: t.name, artist: t.artist, count: t.count }));
		}
		return topAlbums.map((a, i) => ({ rank: i + 1, name: a.name, artist: a.artist, count: a.count }));
	});

	const rows = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const filtered = q
			? baseRows.filter((r) => r.name.toLowerCase().includes(q) || (r.artist ?? '').toLowerCase().includes(q))
			: baseRows;

		const sorted = [...filtered].sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'rank') cmp = a.rank - b.rank;
			else if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortKey === 'artist') cmp = (a.artist ?? '').localeCompare(b.artist ?? '');
			else cmp = a.count - b.count;
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return sorted;
	});

	function sortBy(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = key === 'count' ? 'desc' : 'asc';
		}
	}

	function csvField(value: string): string {
		if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
		return value;
	}

	function exportCsv() {
		const headers =
			category === 'artists' ? ['Rank', 'Name', 'Scrobbles'] : ['Rank', 'Name', 'Artist', 'Scrobbles'];
		const lines = [headers.join(',')];
		for (const r of rows) {
			const cells =
				category === 'artists'
					? [String(r.rank), csvField(r.name), String(r.count)]
					: [String(r.rank), csvField(r.name), csvField(r.artist ?? ''), String(r.count)];
			lines.push(cells.join(','));
		}
		const csv = lines.join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `tourmaline-${category}.csv`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}
</script>

{#snippet sortIcon(key: SortKey)}
	{#if sortKey === key}
		{#if sortDir === 'asc'}
			<ArrowUp size={12} />
		{:else}
			<ArrowDown size={12} />
		{/if}
	{:else}
		<ArrowUpDown size={12} class="opacity-30" />
	{/if}
{/snippet}

<div class="mb-6 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
	<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
		<div>
			<h2 class="text-base font-semibold sm:text-lg">Dataset Explorer</h2>
			<p class="text-xs text-[var(--text-dim)]">
				Search, sort, and export your top 50 artists, tracks, and albums
			</p>
		</div>
		<div class="shrink-0 text-[var(--accent)]">
			<Table2 size={18} />
		</div>
	</div>

	<div class="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Dataset category">
			{#each CATEGORIES as cat (cat.id)}
				<button
					class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {category === cat.id
						? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
						: 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'}"
					onclick={() => (category = cat.id)}
					role="radio"
					aria-checked={category === cat.id}
				>
					{cat.label}
				</button>
			{/each}
		</div>

		<div class="relative min-w-[140px] flex-1">
			<Search size={14} class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[var(--text-dim)]" />
			<input
				type="text"
				placeholder="Search {category}..."
				bind:value={search}
				class="w-full rounded border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pr-2 pl-7 text-xs text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none sm:text-sm"
			/>
		</div>

		<button
			onclick={exportCsv}
			class="flex shrink-0 items-center gap-1.5 rounded border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:text-sm"
		>
			<Download size={14} />
			Export CSV
		</button>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs sm:text-sm">
			<thead>
				<tr class="border-b border-[var(--border)] text-[var(--text-dim)]">
					<th class="cursor-pointer py-1.5 pr-2 font-medium select-none">
						<button class="inline-flex items-center gap-1" onclick={() => sortBy('rank')}>
							#{@render sortIcon('rank')}
						</button>
					</th>
					<th class="cursor-pointer py-1.5 pr-2 font-medium select-none">
						<button class="inline-flex items-center gap-1" onclick={() => sortBy('name')}>
							Name{@render sortIcon('name')}
						</button>
					</th>
					{#if category !== 'artists'}
						<th class="cursor-pointer py-1.5 pr-2 font-medium select-none">
							<button class="inline-flex items-center gap-1" onclick={() => sortBy('artist')}>
								Artist{@render sortIcon('artist')}
							</button>
						</th>
					{/if}
					<th class="cursor-pointer py-1.5 text-right font-medium select-none">
						<button class="inline-flex items-center gap-1" onclick={() => sortBy('count')}>
							Scrobbles{@render sortIcon('count')}
						</button>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (category + row.rank + row.name)}
					<tr
						class="cursor-pointer border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-2)]"
						onclick={() => (selected = row)}
					>
						<td class="py-1.5 pr-2 text-[var(--text-muted)]">{row.rank}</td>
						<td class="max-w-[220px] truncate py-1.5 pr-2">{row.name}</td>
						{#if category !== 'artists'}
							<td class="max-w-[180px] truncate py-1.5 pr-2 text-[var(--text-muted)]">{row.artist}</td>
						{/if}
						<td class="py-1.5 text-right font-mono text-[var(--text-muted)]">{row.count.toLocaleString()}</td>
					</tr>
				{/each}
				{#if rows.length === 0}
					<tr>
						<td colspan={category === 'artists' ? 3 : 4} class="py-4 text-center text-[var(--text-dim)]">
							No matches
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>

{#if selected}
	<DatasetItemModal
		row={selected}
		{category}
		{artistRankHistory}
		{topArtistsByWeeksActive}
		{monthlyArtistPlays}
		onClose={() => (selected = null)}
	/>
{/if}
