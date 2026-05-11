<script lang="ts">
	import { onMount } from 'svelte';
	import { CalendarHeart } from '@lucide/svelte';
	import type { OnThisDayEntry } from '$lib/analysis/on-this-day';

	let { entries = [] }: { entries: OnThisDayEntry[] } = $props();

	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	function yearsAgo(year: number): string {
		const diff = new Date().getFullYear() - year;
		if (diff === 1) return '1 year ago';
		return `${diff} years ago`;
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
	class="scroll-reveal rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
	class:revealed
>
	<div class="mb-4 flex items-start justify-between gap-4">
		<div>
			<h2 class="text-base font-semibold sm:text-lg">On This Day</h2>
			<p class="text-xs text-[var(--text-dim)]">What you were listening to on this date in previous years</p>
		</div>
		<div class="shrink-0 text-[var(--accent)]">
			<CalendarHeart size={20} />
		</div>
	</div>

	{#if entries.length === 0}
		<p class="text-sm text-[var(--text-dim)]">No listening data from this date in previous years yet.</p>
	{:else}
		<div class="space-y-3">
			{#each entries as entry, i (entry.year)}
				<div
					class="stagger-item flex items-center gap-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5"
					class:stagger-visible={revealed}
					style="transition-delay:{revealed ? i * 60 : 0}ms"
				>
					<span class="w-14 shrink-0 font-mono text-sm font-bold text-[var(--accent)]">{entry.year}</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-[var(--text)]">{entry.topArtist}</p>
						<p class="text-xs text-[var(--text-dim)]">{yearsAgo(entry.year)}</p>
					</div>
					<div class="shrink-0 text-right">
						<p class="font-mono text-sm font-bold text-[var(--text)]">{entry.scrobbleCount}</p>
						<p class="text-xs text-[var(--text-dim)]">scrobbles</p>
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
		transform: translateY(8px);
		transition: opacity 0.35s ease, transform 0.35s ease;
	}
	.stagger-item.stagger-visible {
		opacity: 1;
		transform: translateY(0);
	}
</style>
