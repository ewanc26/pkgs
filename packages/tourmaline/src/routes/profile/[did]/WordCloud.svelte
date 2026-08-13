<script lang="ts">
	import { Cloud } from '@lucide/svelte';

	let {
		topArtists = [],
		topTracks = [],
		topAlbums = []
	}: {
		topArtists: Array<{ name: string; count: number }>;
		topTracks: Array<{ name: string; artist: string; count: number }>;
		topAlbums: Array<{ name: string; artist: string; count: number }>;
	} = $props();

	type Source = 'artists' | 'tracks' | 'albums';
	let source = $state<Source>('artists');

	const STOP_WORDS = new Set([
		'the',
		'a',
		'an',
		'of',
		'and',
		'in',
		'on',
		'feat',
		'ft',
		'with',
		'vs'
	]);

	// A handful of shades near the accent green, cycled per token.
	const PALETTE = [
		'var(--accent)',
		'var(--accent-bright)',
		'var(--accent-dim)',
		'var(--text-muted)'
	];

	const MIN_FONT_REM = 0.75;
	const MAX_FONT_REM = 2.5;
	const MAX_TOKENS = 70;

	function tokenize(name: string): string[] {
		return name
			.toLowerCase()
			.split(/[^\p{L}\p{N}]+/u)
			.filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
	}

	interface WeightedToken {
		token: string;
		weight: number;
	}

	function buildTokens(src: Source): WeightedToken[] {
		const weights = new Map<string, number>();

		function add(name: string, weight: number) {
			for (const token of tokenize(name)) {
				weights.set(token, (weights.get(token) ?? 0) + weight);
			}
		}

		if (src === 'artists') {
			for (const artist of topArtists) add(artist.name, artist.count);
		} else if (src === 'tracks') {
			for (const track of topTracks) add(track.name, track.count);
		} else {
			for (const album of topAlbums) add(album.name, album.count);
		}

		return Array.from(weights.entries())
			.map(([token, weight]) => ({ token, weight }))
			.sort((a, b) => b.weight - a.weight)
			.slice(0, MAX_TOKENS);
	}

	const tokens = $derived(buildTokens(source));
	const maxWeight = $derived(tokens.reduce((max, t) => Math.max(max, t.weight), 1));
	const minWeight = $derived(tokens.reduce((min, t) => Math.min(min, t.weight), maxWeight));

	function fontSize(weight: number): number {
		if (maxWeight === minWeight) return (MIN_FONT_REM + MAX_FONT_REM) / 2;
		// Square-root scale so the top token doesn't dwarf the rest.
		const normalised = (Math.sqrt(weight) - Math.sqrt(minWeight)) / (Math.sqrt(maxWeight) - Math.sqrt(minWeight));
		return MIN_FONT_REM + normalised * (MAX_FONT_REM - MIN_FONT_REM);
	}

	// Shuffle deterministically by weight rank so bigger words aren't all clustered at the start,
	// while still keeping the layout stable across re-renders of the same source.
	const displayTokens = $derived(
		tokens
			.map((t, i) => ({ ...t, i }))
			.sort((a, b) => (a.i % 3) - (b.i % 3) || b.weight - a.weight)
	);
</script>

<div class="rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
	<div class="mb-3 flex items-center justify-between sm:mb-4">
		<div class="flex items-center gap-2">
			<Cloud size={16} class="text-[var(--accent)]" />
			<h2 class="text-base font-semibold sm:text-lg">Word Cloud</h2>
		</div>
	</div>

	<div class="mb-4 flex gap-1 rounded-md bg-[var(--surface-2)] p-1">
		<button
			class="flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors"
			class:bg-[var(--surface)]={source === 'artists'}
			class:shadow-sm={source === 'artists'}
			class:text-[var(--accent)]={source === 'artists'}
			class:text-[var(--text-muted)]={source !== 'artists'}
			onclick={() => (source = 'artists')}
		>
			Artists
		</button>
		<button
			class="flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors"
			class:bg-[var(--surface)]={source === 'tracks'}
			class:shadow-sm={source === 'tracks'}
			class:text-[var(--accent)]={source === 'tracks'}
			class:text-[var(--text-muted)]={source !== 'tracks'}
			onclick={() => (source = 'tracks')}
		>
			Tracks
		</button>
		<button
			class="flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors"
			class:bg-[var(--surface)]={source === 'albums'}
			class:shadow-sm={source === 'albums'}
			class:text-[var(--accent)]={source === 'albums'}
			class:text-[var(--text-muted)]={source !== 'albums'}
			onclick={() => (source = 'albums')}
		>
			Albums
		</button>
	</div>

	{#if displayTokens.length === 0}
		<p class="text-sm text-[var(--text-dim)]">Not enough data to build a word cloud yet.</p>
	{:else}
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 leading-none">
			{#each displayTokens as { token, weight, i } (token)}
				<span
					class="font-semibold"
					style="font-size: {fontSize(weight)}rem; color: {PALETTE[i % PALETTE.length]};"
					title="{token} · {weight.toLocaleString()}"
				>
					{token}
				</span>
			{/each}
		</div>
	{/if}
</div>
