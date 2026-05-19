<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { StoryRecap } from '$lib/analysis/story-recap';

	let { recap }: { recap: StoryRecap } = $props();

	let current = $state(0);
	let revealed = $state(false);
	let paused = $state(false);
	let containerEl: HTMLDivElement;

	const total = $derived(recap.cards.length);
	const card = $derived(recap.cards[current]);

	let autoAdvanceTimer: ReturnType<typeof setInterval> | null = null;

	function next() {
		current = (current + 1) % total;
	}

	function prev() {
		current = (current - 1 + total) % total;
	}

	function goTo(index: number) {
		current = index;
	}

	function resetAutoAdvance() {
		if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
		if (!paused) {
			autoAdvanceTimer = setInterval(next, 5000);
		}
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') { next(); resetAutoAdvance(); }
		if (e.key === 'ArrowLeft') { prev(); resetAutoAdvance(); }
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

	// Auto-advance when revealed
	$effect(() => {
		if (revealed && !paused) {
			resetAutoAdvance();
		}
		return () => {
			if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
		};
	});
</script>

<svelte:window onkeydown={revealed ? handleKey : undefined} />

<div
	bind:this={containerEl}
	class="scroll-reveal rounded border border-[var(--accent)]/30 bg-[var(--surface)] overflow-hidden"
	class:revealed
	role="region"
	aria-label="Story recap"
	onmouseenter={() => { paused = true; resetAutoAdvance(); }}
	onmouseleave={() => { paused = false; resetAutoAdvance(); }}
	ontouchstart={() => { paused = true; }}
	ontouchend={() => { paused = false; resetAutoAdvance(); }}
>
	<!-- Card area -->
	<div class="relative min-h-[280px] p-6 sm:min-h-[320px] sm:p-8">
		<!-- Background glow -->
		<div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-transparent"></div>

		<!-- Content -->
		<div class="relative">
			<p class="font-mono text-xs uppercase tracking-widest text-[var(--accent)]">
				{recap.label} recap · {current + 1}/{total}
			</p>

			{#if card.stat}
				<p class="mt-4 text-4xl font-bold tabular-nums text-[var(--accent)] sm:text-5xl">
					{card.stat}
				</p>
				{#if card.statLabel}
					<p class="mt-1 text-sm text-[var(--text-muted)]">{card.statLabel}</p>
				{/if}
			{/if}

			<h2 class="mt-4 text-xl font-bold sm:text-2xl">{card.heading}</h2>
			<p class="mt-2 text-sm text-[var(--text-muted)] sm:text-base">{card.body}</p>
		</div>

		<!-- Navigation arrows -->
		{#if total > 1}
			<button
				class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--bg)]/80 p-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
				onclick={() => { prev(); resetAutoAdvance(); }}
				aria-label="Previous card"
			>
				<ChevronLeft size={16} />
			</button>
			<button
				class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--bg)]/80 p-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
				onclick={() => { next(); resetAutoAdvance(); }}
				aria-label="Next card"
			>
				<ChevronRight size={16} />
			</button>
		{/if}
	</div>

	<!-- Dots -->
	{#if total > 1}
		<div class="flex items-center justify-center gap-1.5 border-t border-[var(--border)] px-4 py-3">
			{#each recap.cards as _, i (i)}
				<button
					class="h-1.5 rounded-full transition-all {i === current
						? 'w-4 bg-[var(--accent)]'
						: 'w-1.5 bg-[var(--text-dim)] hover:bg-[var(--text-muted)]'}"
					onclick={() => { goTo(i); resetAutoAdvance(); }}
					aria-label="Go to card {i + 1}"
				></button>
			{/each}
		</div>
	{/if}
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
