<script lang="ts">
	import { onMount } from 'svelte';
	import { renderNoiseAvatar } from '@ewanc26/noise-avatar';
	import type { DiscoveredArtist } from '$lib/types';

	let { artists = [] }: { artists: DiscoveredArtist[] } = $props();

	let revealed = $state(false);
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

	// Show top 20 most recently discovered
	const recent = $derived(artists.slice(0, 20));
</script>

<div
	bind:this={containerEl}
	class="scroll-reveal rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
	class:revealed
>
	<div class="mb-4 flex items-start justify-between gap-4">
		<div>
			<h2 class="text-base font-semibold sm:text-lg">Discoveries</h2>
			<p class="text-xs text-[var(--text-dim)]">Artists you heard for the first time</p>
		</div>
		<div class="shrink-0 text-right">
			<p class="text-2xl font-bold text-[var(--accent)]">{artists.length.toLocaleString()}</p>
			<p class="text-xs text-[var(--text-dim)]">total artists</p>
		</div>
	</div>

	{#if recent.length === 0}
		<p class="text-sm text-[var(--text-dim)]">Artist discovery data not available yet.</p>
	{:else}
		<ol class="space-y-2">
			{#each recent as artist, i (artist.name)}
				<li
					class="stagger-item flex items-center gap-2.5"
					class:stagger-visible={revealed}
					style="transition-delay:{revealed ? i * 35 : 0}ms"
				>
					{#if artist.imageUrl}
						<img src={artist.imageUrl} alt={artist.name} class="h-7 w-7 shrink-0 rounded" />
					{:else}
						<canvas use:noiseAvatar={artist.name} class="h-7 w-7 shrink-0 rounded"></canvas>
					{/if}
					<span class="min-w-0 shrink truncate text-sm font-medium text-[var(--text)]">{artist.name}</span>
					<span class="ml-auto shrink-0 text-xs text-[var(--text-dim)]">{formatDate(artist.firstListen)}</span>
					<span class="w-10 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">{artist.count.toLocaleString()}</span>
				</li>
			{/each}
		</ol>
		{#if artists.length > 20}
			<p class="mt-3 text-xs text-[var(--text-dim)]">…and {(artists.length - 20).toLocaleString()} more</p>
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
