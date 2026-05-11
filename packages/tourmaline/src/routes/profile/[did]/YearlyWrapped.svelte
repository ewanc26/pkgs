<script lang="ts">
	import { onMount } from 'svelte';
	import { Copy, Check } from '@lucide/svelte';
	import type { ListenerProfile } from '$lib/types';

	let {
		profile,
		displayName = 'Listener'
	}: { profile: ListenerProfile; displayName: string } = $props();

	let revealed = $state(false);
	let copied = $state(false);
	let containerEl: HTMLDivElement;

	const year = new Date().getFullYear();

	const hours = $derived(Math.floor(profile.totalMinutes / 60));
	const topArtist = $derived(profile.topArtists[0]?.name ?? '—');
	const topTrack = $derived(
		profile.topTracks[0] ? `${profile.topTracks[0].name} — ${profile.topTracks[0].artist}` : '—'
	);
	const topGenre = $derived(profile.genres[0]?.name ?? '—');

	function buildShareText(): string {
		const lines = [
			`🎵 My ${year} listening on Tourmaline`,
			``,
			`⏱ ${hours.toLocaleString()} hours listened`,
			`🎤 Top artist: ${topArtist}`,
			`🎶 Top track: ${topTrack}`,
			`🎸 Top genre: ${topGenre}`,
			`🔀 ${profile.uniqueArtists.toLocaleString()} unique artists`,
			`📊 Diversity score: ${profile.diversityScore}/100`,
			``,
			`tourmaline.ewancroft.uk/profile/${encodeURIComponent(profile.handle ?? profile.did)}`
		];
		return lines.join('\n');
	}

	async function copyStats() {
		try {
			await navigator.clipboard.writeText(buildShareText());
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// fallback: select a textarea
		}
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.15 }
		);
		observer.observe(containerEl);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={containerEl}
	class="scroll-reveal"
	class:revealed
>
	<!-- Card -->
	<div class="wrapped-card relative overflow-hidden rounded border border-[var(--accent)]/40 bg-[var(--surface)] p-6 sm:p-8">
		<!-- Background glow -->
		<div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-transparent"></div>

		<p class="font-mono text-xs uppercase tracking-widest text-[var(--accent)]">{year} wrapped</p>
		<h2 class="mt-1 text-xl font-bold sm:text-2xl">{displayName}</h2>

		<div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div>
				<p class="text-2xl font-bold text-[var(--accent)] sm:text-3xl">{hours.toLocaleString()}</p>
				<p class="mt-0.5 text-xs text-[var(--text-muted)]">hours listened</p>
			</div>
			<div>
				<p class="text-2xl font-bold sm:text-3xl">{profile.uniqueArtists.toLocaleString()}</p>
				<p class="mt-0.5 text-xs text-[var(--text-muted)]">unique artists</p>
			</div>
			<div>
				<p class="text-2xl font-bold sm:text-3xl">{profile.totalScrobbles.toLocaleString()}</p>
				<p class="mt-0.5 text-xs text-[var(--text-muted)]">scrobbles</p>
			</div>
			<div>
				<p class="text-2xl font-bold sm:text-3xl">{profile.diversityScore}</p>
				<p class="mt-0.5 text-xs text-[var(--text-muted)]">diversity /100</p>
			</div>
		</div>

		<div class="mt-6 space-y-2 border-t border-[var(--border)] pt-4">
			<div class="flex items-center justify-between gap-4">
				<span class="shrink-0 text-xs text-[var(--text-dim)]">Top artist</span>
				<span class="truncate text-right text-sm font-medium">{topArtist}</span>
			</div>
			<div class="flex items-center justify-between gap-4">
				<span class="shrink-0 text-xs text-[var(--text-dim)]">Top track</span>
				<span class="truncate text-right text-sm font-medium">{topTrack}</span>
			</div>
			<div class="flex items-center justify-between gap-4">
				<span class="shrink-0 text-xs text-[var(--text-dim)]">Top genre</span>
				<span class="truncate text-right text-sm font-medium">{topGenre}</span>
			</div>
		</div>

		<p class="mt-4 text-xs text-[var(--text-dim)]">tourmaline · via AT Protocol</p>
	</div>

	<!-- Actions -->
	<div class="mt-3 flex justify-end">
		<button
			onclick={copyStats}
			class="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
		>
			{#if copied}
				<Check size={12} class="text-[var(--accent)]" />
				Copied!
			{:else}
				<Copy size={12} />
				Copy stats
			{/if}
		</button>
	</div>
</div>

<style>
	.scroll-reveal {
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.6s ease, transform 0.6s ease;
	}
	.scroll-reveal.revealed {
		opacity: 1;
		transform: translateY(0);
	}
</style>
