<script lang="ts">
	import { onMount } from 'svelte';
	import { renderNoiseAvatar } from '@ewanc26/noise-avatar';
	import { Loader2, Heart, Sparkles, Users } from '@lucide/svelte';
	import { loadProfile } from '$lib/client/load-profile';
	import { compareProfiles, compatibilityLabel, type ComparisonResult } from '$lib/analysis/comparison';
	import type { ListenerProfile } from '$lib/types';

	interface Side {
		did: string;
		handle?: string;
		pdsUrl?: string;
		displayName?: string;
		avatar?: string;
		error?: string;
	}

	let { data }: { data: { a: Side; b: Side } } = $props();

	function noiseAvatar(canvas: HTMLCanvasElement, seed: string) {
		renderNoiseAvatar(canvas, seed, { displaySize: 40, gridSize: 5 });
		return {
			update(newSeed: string) {
				renderNoiseAvatar(canvas, newSeed, { displaySize: 40, gridSize: 5 });
			}
		};
	}

	let phase = $state<'loading' | 'complete' | 'error'>('loading');
	let error = $state('');
	let profileA = $state<ListenerProfile | null>(null);
	let profileB = $state<ListenerProfile | null>(null);
	let result = $state<ComparisonResult | null>(null);

	// Coarse combined progress across both sides — comparison needs both
	// fully enriched to be meaningful, so unlike the single-profile page this
	// doesn't reveal partial results.
	let loadedA = $state(0);
	let loadedB = $state(0);
	let enrichA = $state({ current: 0, total: 0 });
	let enrichB = $state({ current: 0, total: 0 });

	onMount(async () => {
		if (data.a.error || data.b.error) {
			error = data.a.error || data.b.error || 'Failed to resolve one of these identifiers.';
			phase = 'error';
			return;
		}
		if (!data.a.did || !data.b.did || !data.a.pdsUrl || !data.b.pdsUrl) {
			error = 'Could not resolve both identifiers.';
			phase = 'error';
			return;
		}

		try {
			const [resA, resB] = await Promise.all([
				loadProfile(data.a.did, data.a.pdsUrl, data.a.handle, data.a.displayName, 'all', {
					onFetchProgress: (n) => { loadedA = n; },
					onEnrichProgress: (current, total) => { enrichA = { current, total }; }
				}),
				loadProfile(data.b.did, data.b.pdsUrl, data.b.handle, data.b.displayName, 'all', {
					onFetchProgress: (n) => { loadedB = n; },
					onEnrichProgress: (current, total) => { enrichB = { current, total }; }
				})
			]);

			const pA = resA.results.all?.profile ?? null;
			const pB = resB.results.all?.profile ?? null;

			if (!pA || !pB || pA.totalScrobbles === 0 || pB.totalScrobbles === 0) {
				error = 'One or both listeners have no scrobbles to compare.';
				phase = 'error';
				return;
			}

			profileA = pA;
			profileB = pB;
			result = compareProfiles(pA, pB);
			phase = 'complete';
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			phase = 'error';
		}
	});

	const nameA = $derived(data.a.displayName ?? data.a.handle ?? data.a.did);
	const nameB = $derived(data.b.displayName ?? data.b.handle ?? data.b.did);
</script>

<svelte:head>
	<title>{nameA} vs {nameB} — Tourmaline</title>
	<meta name="description" content="Music taste comparison between {nameA} and {nameB}" />
</svelte:head>

<div class="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
	<!-- Header: both identities -->
	<header class="mb-6 flex items-center justify-center gap-4 sm:mb-8 sm:gap-6">
		<div class="flex flex-col items-center gap-2">
			{#if data.a.avatar}
				<img src={data.a.avatar} alt="" class="h-12 w-12 rounded-full border border-[var(--border)] sm:h-14 sm:w-14" />
			{:else}
				<canvas use:noiseAvatar={data.a.did} class="h-12 w-12 rounded-full border border-[var(--border)] sm:h-14 sm:w-14"></canvas>
			{/if}
			<p class="max-w-[8rem] truncate text-sm font-medium text-[var(--text)]">{nameA}</p>
		</div>

		<Heart size={20} class="shrink-0 text-[var(--accent)]" />

		<div class="flex flex-col items-center gap-2">
			{#if data.b.avatar}
				<img src={data.b.avatar} alt="" class="h-12 w-12 rounded-full border border-[var(--border)] sm:h-14 sm:w-14" />
			{:else}
				<canvas use:noiseAvatar={data.b.did} class="h-12 w-12 rounded-full border border-[var(--border)] sm:h-14 sm:w-14"></canvas>
			{/if}
			<p class="max-w-[8rem] truncate text-sm font-medium text-[var(--text)]">{nameB}</p>
		</div>
	</header>

	{#if phase === 'loading'}
		<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-5">
			<div class="flex items-center gap-3">
				<Loader2 size={16} class="shrink-0 animate-spin text-[var(--accent)]" />
				<div class="min-w-0">
					<p class="text-sm font-medium text-[var(--text)]">Loading both profiles…</p>
					<p class="mt-0.5 text-xs text-[var(--text-dim)]">
						{loadedA.toLocaleString()} + {loadedB.toLocaleString()} scrobbles fetched
						{#if enrichA.total > 0 || enrichB.total > 0}
							· enriching {(enrichA.current + enrichB.current).toLocaleString()}/{(enrichA.total + enrichB.total).toLocaleString()} artists
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}

	{#if phase === 'error'}
		<div class="rounded border border-[var(--error)]/40 bg-[var(--error)]/10 p-5">
			<p class="text-sm font-medium text-[var(--error)]">{error}</p>
			<a href="/compare" class="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">Try again</a>
		</div>
	{/if}

	{#if phase === 'complete' && result && profileA && profileB}
		<!-- Compatibility score -->
		<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-5 text-center sm:mb-8 sm:p-8">
			<p class="font-mono text-[11px] uppercase tracking-widest text-[var(--text-dim)]">Compatibility</p>
			<p class="mt-2 text-4xl font-bold text-[var(--accent)] sm:text-5xl">{result.compatibilityScore}<span class="text-lg text-[var(--text-muted)]">/100</span></p>
			<p class="mt-2 text-sm text-[var(--text-muted)]">{compatibilityLabel(result.compatibilityScore)}</p>
		</div>

		<!-- Shared artists -->
		{#if result.sharedArtists.length > 0}
			<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:mb-8 sm:p-6">
				<div class="mb-4 flex items-center gap-2">
					<Users size={15} class="text-[var(--accent)]" />
					<h2 class="text-base font-semibold sm:text-lg">Shared artists ({result.sharedArtists.length})</h2>
				</div>
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each result.sharedArtists.slice(0, 20) as artist (artist.name)}
						<li class="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
							<span class="truncate text-sm text-[var(--text)]">{artist.name}</span>
							<span class="shrink-0 font-mono text-xs text-[var(--text-dim)]">{artist.countA} / {artist.countB}</span>
						</li>
					{/each}
				</ul>
			</div>
		{:else}
			<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)] sm:mb-8 sm:p-6">
				No shared artists in either listener's top 50 — but check shared genres below.
			</div>
		{/if}

		<!-- Shared genres -->
		{#if result.sharedGenres.length > 0}
			<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:mb-8 sm:p-6">
				<h2 class="mb-4 text-base font-semibold sm:text-lg">Shared genres</h2>
				<div class="flex flex-wrap gap-2">
					{#each result.sharedGenres.slice(0, 12) as genre (genre.name)}
						<span class="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--text-muted)]">{genre.name}</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Shared discoveries -->
		{#if result.sharedDiscoveries.length > 0}
			<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:mb-8 sm:p-6">
				<div class="mb-4 flex items-center gap-2">
					<Sparkles size={15} class="text-[var(--accent)]" />
					<h2 class="text-base font-semibold sm:text-lg">Discovered around the same time</h2>
				</div>
				<ul class="space-y-1.5">
					{#each result.sharedDiscoveries as d (d.name)}
						<li class="text-sm text-[var(--text-muted)]">
							<span class="text-[var(--text)]">{d.name}</span>
							— {d.daysApart === 0 ? 'the same day' : `${d.daysApart} day${d.daysApart === 1 ? '' : 's'} apart`}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Unique to each -->
		<div class="mb-6 grid gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-6">
			{#if result.uniqueToA.length > 0}
				<div class="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
					<h2 class="mb-3 text-sm font-semibold">Only {nameA} listens to</h2>
					<ul class="space-y-1.5">
						{#each result.uniqueToA.slice(0, 10) as artist (artist.name)}
							<li class="truncate text-sm text-[var(--text-muted)]">{artist.name}</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if result.uniqueToB.length > 0}
				<div class="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
					<h2 class="mb-3 text-sm font-semibold">Only {nameB} listens to</h2>
					<ul class="space-y-1.5">
						{#each result.uniqueToB.slice(0, 10) as artist (artist.name)}
							<li class="truncate text-sm text-[var(--text-muted)]">{artist.name}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	<div class="mt-6 text-center">
		<a href="/compare" class="text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)]">Compare someone else</a>
	</div>
</div>
