<script lang="ts">
	import { onMount } from 'svelte';
	import type { Milestone } from '$lib/types';
	import { Trophy, Music, Users, LayoutGrid } from '@lucide/svelte';

	let {
		scrobbles = [],
		artists = [],
		tracks = [],
		albums = []
	}: {
		scrobbles: Milestone[];
		artists: Milestone[];
		tracks: Milestone[];
		albums: Milestone[];
	} = $props();

	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	// Combine and sort by scrobble time descending
	const allMilestones = $derived(
		[
			...scrobbles.map((m) => ({ ...m, type: 'scrobble' as const })),
			...artists.map((m) => ({ ...m, type: 'artist' as const })),
			...tracks.map((m) => ({ ...m, type: 'track' as const })),
			...albums.map((m) => ({ ...m, type: 'album' as const }))
		]
			.sort((a, b) => b.scrobble.playedTime.localeCompare(a.scrobble.playedTime))
			.slice(0, 30) // Show last 30 landmarks
	);

	function formatDate(d: string): string {
		return new Date(d).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
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
</script>

<div
	bind:this={containerEl}
	class="scroll-reveal rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
	class:revealed
>
	<div class="mb-4">
		<h2 class="text-base font-semibold sm:text-lg">Milestones</h2>
		<p class="text-xs text-[var(--text-dim)]">Major landmarks in your listening history</p>
	</div>

	{#if allMilestones.length === 0}
		<p class="text-sm text-[var(--text-dim)]">No milestones reached yet. Keep listening!</p>
	{:else}
		<div
			class="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-[var(--border)]"
		>
			{#each allMilestones as milestone, i}
				<div
					class="stagger-item relative pl-8"
					class:stagger-visible={revealed}
					style="transition-delay:{revealed ? i * 40 : 0}ms"
				>
					<div
						class="absolute left-0 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)] shadow-sm"
					>
						{#if milestone.type === 'scrobble'}
							<Trophy size={12} />
						{:else if milestone.type === 'artist'}
							<Users size={12} />
						{:else if milestone.type === 'track'}
							<Music size={12} />
						{:else}
							<LayoutGrid size={12} />
						{/if}
					</div>
					<div class="flex flex-col">
						<p class="text-sm font-semibold text-[var(--text)]">
							{milestone.count.toLocaleString()}
							{#if milestone.type === 'scrobble'}
								scrobbles
							{:else if milestone.type === 'artist'}
								unique artists
							{:else if milestone.type === 'track'}
								unique tracks
							{:else}
								unique albums
							{/if}
						</p>
						<p class="text-xs text-[var(--text-muted)]">
							<span class="font-medium text-[var(--text)]">{milestone.scrobble.trackName}</span>
							<span class="px-0.5 text-[var(--text-dim)]">by</span>
							<span class="font-medium text-[var(--text)]">{milestone.scrobble.artists[0]?.name}</span
							>
						</p>
						<p class="mt-1 text-[10px] text-[var(--text-dim)]">
							{formatDate(milestone.scrobble.playedTime)}
						</p>
					</div>
				</div>
			{/each}
		</div>
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
