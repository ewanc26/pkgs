<script lang="ts">
	import { onMount } from 'svelte';
	import { renderNoiseAvatar } from '@ewanc26/noise-avatar';
	import type { DiscoveredArtist, DiscoveredItem } from '$lib/types';

	let {
		artists = [],
		tracks = [],
		albums = []
	}: {
		artists: DiscoveredArtist[];
		tracks: DiscoveredItem[];
		albums: DiscoveredItem[];
	} = $props();

	let revealed = $state(false);
	let activeTab = $state<'artists' | 'tracks' | 'albums'>('artists');
	let containerEl: HTMLDivElement;

	function noiseAvatar(canvas: HTMLCanvasElement, seed: string) {
		renderNoiseAvatar(canvas, seed, { displaySize: 28, gridSize: 5 });
		return {
			update(newSeed: string) {
				renderNoiseAvatar(canvas, newSeed, { displaySize: 28, gridSize: 5 });
			}
		};
	}

	function formatDate(d: string): string {
		const date = new Date(d + 'T00:00:00Z');
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	const activeList = $derived(
		activeTab === 'artists' ? artists : activeTab === 'tracks' ? tracks : albums
	);
	const recent = $derived(activeList.slice(0, 20));
</script>

<div
	bind:this={containerEl}
	class="scroll-reveal flex flex-col rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
	class:revealed
>
	<div class="mb-4 flex items-start justify-between gap-4">
		<div>
			<h2 class="text-base font-semibold sm:text-lg">Discoveries</h2>
			<p class="text-xs text-[var(--text-dim)]">Things you heard for the first time</p>
		</div>
		<div class="shrink-0 text-right">
			<p class="text-2xl font-bold text-[var(--accent)]">{activeList.length.toLocaleString()}</p>
			<p class="text-xs text-[var(--text-dim)]">total {activeTab}</p>
		</div>
	</div>

	<div class="mb-4 flex gap-1 rounded-md bg-[var(--surface-alt)] p-1">
		<button
			class="flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors"
			class:bg-[var(--surface)]={activeTab === 'artists'}
			class:shadow-sm={activeTab === 'artists'}
			onclick={() => (activeTab = 'artists')}
		>
			Artists
		</button>
		<button
			class="flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors"
			class:bg-[var(--surface)]={activeTab === 'tracks'}
			class:shadow-sm={activeTab === 'tracks'}
			onclick={() => (activeTab = 'tracks')}
		>
			Tracks
		</button>
		<button
			class="flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors"
			class:bg-[var(--surface)]={activeTab === 'albums'}
			class:shadow-sm={activeTab === 'albums'}
			onclick={() => (activeTab = 'albums')}
		>
			Albums
		</button>
	</div>

	{#if recent.length === 0}
		<p class="text-sm text-[var(--text-dim)]">Discovery data not available yet.</p>
	{:else}
		<ol class="space-y-2">
			{#each recent as item, i (item.name + i)}
				<li
					class="stagger-item flex items-center gap-2.5"
					class:stagger-visible={revealed}
					style="transition-delay:{revealed ? i * 35 : 0}ms"
				>
					{#if activeTab === 'artists'}
						{@const artist = item as DiscoveredArtist}
						{#if artist.imageUrl}
							<img src={artist.imageUrl} alt={artist.name} class="h-7 w-7 shrink-0 rounded" />
						{:else}
							<canvas use:noiseAvatar={artist.name} class="h-7 w-7 shrink-0 rounded"></canvas>
						{/if}
						<span class="min-w-0 shrink truncate text-sm font-medium text-[var(--text)]"
							>{artist.name}</span
						>
					{:else}
						{@const trackOrAlbum = item as DiscoveredItem}
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-[var(--text)]">{trackOrAlbum.name}</p>
							<p class="truncate text-[10px] text-[var(--text-dim)]">{trackOrAlbum.artist}</p>
						</div>
					{/if}
					<span class="ml-auto shrink-0 text-xs text-[var(--text-dim)]"
						>{formatDate(item.firstListen)}</span
					>
					<span class="w-10 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]"
						>{item.count.toLocaleString()}</span
					>
				</li>
			{/each}
		</ol>
		{#if activeList.length > 20}
			<p class="mt-3 text-xs text-[var(--text-dim)]">
				…and {(activeList.length - 20).toLocaleString()} more
			</p>
		{/if}
	{/if}
</div>

<style>
	.scroll-reveal {
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.5s ease, transform 0.5s ease;
	}
	.scroll-reveal.revealed {
		opacity: 1;
		transform: translateY(0);
	}

	.stagger-item {
		opacity: 0;
		transform: translateX(-6px);
		transition: opacity 0.35s ease, transform 0.35s ease;
	}
	.stagger-item.stagger-visible {
		opacity: 1;
		transform: translateX(0);
	}
</style>
