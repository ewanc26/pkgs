<script lang="ts">
	import { onMount } from 'svelte';
	import { Zap, Compass, BarChart2, Ghost } from '@lucide/svelte';
	import type { RemarkableDay } from '$lib/types';

	let { days = [] }: { days: RemarkableDay[] } = $props();

	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	const ICONS = {
		biggest: Zap,
		discovery: Compass,
		genre: BarChart2,
		nostalgic: Ghost,
		artist: Zap,
		unusual: Ghost
	} as const;

	const COLOURS: Record<RemarkableDay['type'], string> = {
		biggest: 'text-yellow-400',
		discovery: 'text-[var(--accent)]',
		genre: 'text-blue-400',
		nostalgic: 'text-purple-400',
		artist: 'text-pink-400',
		unusual: 'text-[var(--text-muted)]'
	};

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
	<h2 class="mb-1 text-base font-semibold sm:text-lg">Remarkable Days</h2>
	<p class="mb-4 text-xs text-[var(--text-dim)]">Moments that stood out across your listening history</p>

	{#if days.length === 0}
		<p class="text-sm text-[var(--text-dim)]">Nothing remarkable yet — keep listening!</p>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each days as day, i (day.date + day.type + i)}
				{@const Icon = ICONS[day.type] ?? Zap}
				<div
					class="stagger-item flex gap-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3"
					class:stagger-visible={revealed}
					style="transition-delay:{revealed ? i * 70 : 0}ms"
				>
					<div class="mt-0.5 shrink-0 {COLOURS[day.type]}">
						<Icon size={16} />
					</div>
					<div class="min-w-0">
						<p class="text-sm font-medium text-[var(--text)]">{day.title}</p>
						<p class="mt-0.5 text-xs text-[var(--text-muted)]">{day.detail}</p>
					</div>
					<div class="ml-auto shrink-0 text-right">
						<p class="font-mono text-lg font-bold text-[var(--text)]">{day.count.toLocaleString()}</p>
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
		transition: opacity 0.4s ease, transform 0.4s ease;
	}
	.stagger-item.stagger-visible {
		opacity: 1;
		transform: translateY(0);
	}
</style>
