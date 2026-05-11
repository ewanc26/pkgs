<script lang="ts">
	import { onMount } from 'svelte';
	import type { MonthlyGenre } from '$lib/types';

	let { monthlyGenres = [] }: { monthlyGenres: MonthlyGenre[] } = $props();

	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	// Palette for up to 6 genres — matches the tourmaline accent family
	const COLOURS = [
		'var(--accent)',
		'#60a5fa', // blue-400
		'#f472b6', // pink-400
		'#fb923c', // orange-400
		'#a78bfa', // violet-400
		'#34d399'  // emerald-400
	];

	// Collect all genre names that appear, sorted by total weight
	const allGenres = $derived.by(() => {
		const totals = new Map<string, number>();
		for (const { genres } of monthlyGenres) {
			for (const { name, weight } of genres) {
				totals.set(name, (totals.get(name) ?? 0) + weight);
			}
		}
		return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 6);
	});

	const colourFor = $derived(new Map(allGenres.map((g, i) => [g, COLOURS[i] ?? '#9ca3af'])));

	function barWidth(month: MonthlyGenre, genre: string): string {
		const total = month.genres.reduce((s, g) => s + g.weight, 0);
		if (total === 0) return '0%';
		const entry = month.genres.find((g) => g.name === genre);
		if (!entry) return '0%';
		return `${Math.round((entry.weight / total) * 100)}%`;
	}

	function monthLabel(ym: string): string {
		const [y, m] = ym.split('-');
		return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', {
			month: 'short',
			year: '2-digit'
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
	<h2 class="mb-1 text-base font-semibold sm:text-lg">Music Evolution</h2>
	<p class="mb-4 text-xs text-[var(--text-dim)]">How your genre tastes shifted month by month</p>

	{#if monthlyGenres.length === 0}
		<p class="text-sm text-[var(--text-dim)]">Not enough genre data yet — enrichment still in progress.</p>
	{:else}
		<!-- Legend -->
		<div class="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
			{#each allGenres as genre (genre)}
				<span class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
					<span class="inline-block h-2.5 w-2.5 rounded-sm" style="background:{colourFor.get(genre)}"></span>
					{genre}
				</span>
			{/each}
		</div>

		<!-- Month rows -->
		<div class="space-y-2">
			{#each monthlyGenres as month, i (month.month)}
				<div
					class="stagger-item flex items-center gap-2"
					style="transition-delay: {revealed ? i * 40 : 0}ms"
					class:stagger-visible={revealed}
				>
					<span class="w-14 shrink-0 text-right font-mono text-xs text-[var(--text-dim)]">
						{monthLabel(month.month)}
					</span>
					<div class="flex h-6 flex-1 overflow-hidden rounded-sm">
						{#each allGenres as genre (genre)}
							{@const w = barWidth(month, genre)}
							{#if w !== '0%'}
								<div
									class="h-full transition-all duration-700"
									style="width:{w}; background:{colourFor.get(genre)}; transition-delay:{revealed ? i * 40 + 100 : 0}ms"
									title="{genre}: {w}"
								></div>
							{/if}
						{/each}
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
		transform: translateX(-8px);
		transition: opacity 0.4s ease, transform 0.4s ease;
	}
	.stagger-item.stagger-visible {
		opacity: 1;
		transform: translateX(0);
	}
</style>
