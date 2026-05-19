<script lang="ts">
	import { onMount } from 'svelte';

	let { minutes = 0, rangeLabel = '' }: { minutes: number, rangeLabel?: string } = $props();

	let displayed = $state(0);
	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	function formatMinutes(m: number): string {
		return m.toLocaleString();
	}

	const days = $derived(Math.floor(minutes / 1440));
	const hours = $derived(Math.floor((minutes % 1440) / 60));
	const showDays = $derived(days > 0);
	const unit = $derived(days > 0 ? 'days' : 'hours');
	const target = $derived(days > 0 ? days : Math.floor(minutes / 60));

	function animateCounter(to: number) {
		const duration = 1600;
		const start = performance.now();
		const from = 0;

		function step(now: number) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			// Ease-out cubic
			const eased = 1 - Math.pow(1 - progress, 3);
			displayed = Math.round(from + (to - from) * eased);
			if (progress < 1) requestAnimationFrame(step);
		}

		requestAnimationFrame(step);
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					revealed = true;
					animateCounter(target);
					observer.disconnect();
				}
			},
			{ threshold: 0.2 }
		);
		observer.observe(containerEl);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={containerEl}
	class="scroll-reveal rounded border border-[var(--border)] bg-[var(--surface)] p-6 text-center sm:p-10"
	class:revealed
>
	<p class="font-mono text-xs uppercase tracking-widest text-[var(--text-dim)]">
        Time spent listening {rangeLabel ? `(${rangeLabel})` : ''}
    </p>

	<div class="my-4 flex items-end justify-center gap-2">
		<span class="tabular-nums text-6xl font-bold tracking-tight text-[var(--accent)] sm:text-8xl">
			{formatMinutes(displayed)}
		</span>
		<span class="mb-2 text-xl text-[var(--text-muted)] sm:text-2xl">{unit}</span>
	</div>

	{#if showDays && hours > 0}
		<p class="text-sm text-[var(--text-muted)]">
			({hours} extra hour{hours === 1 ? '' : 's'})
		</p>
	{/if}
</div>

<style>
	.scroll-reveal {
		opacity: 0;
		transform: translateY(28px);
		transition: opacity 0.6s ease, transform 0.6s ease;
	}
	.scroll-reveal.revealed {
		opacity: 1;
		transform: translateY(0);
	}
</style>
