<script lang="ts">
	import { onMount } from 'svelte';
	import { PartyPopper } from '@lucide/svelte';
	import type { AnniversaryGroups, Anniversary } from '$lib/analysis/anniversaries';

	let { groups }: { groups: AnniversaryGroups } = $props();

	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	const total = $derived(groups.today.length + groups.upcoming.length + groups.past.length);

	function yearsLabel(years: number): string {
		return years === 1 ? '1 year' : `${years} years`;
	}

	function relativeLabel(entry: Anniversary): string {
		if (entry.daysDiff === 0) return 'Today';
		if (entry.daysDiff > 0) return entry.daysDiff === 1 ? 'Tomorrow' : `In ${entry.daysDiff} days`;
		return entry.daysDiff === -1 ? 'Yesterday' : `${-entry.daysDiff} days ago`;
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
			<h2 class="text-base font-semibold sm:text-lg">Anniversaries</h2>
			<p class="text-xs text-[var(--text-dim)]">Artists you discovered around this date in previous years</p>
		</div>
		<div class="shrink-0 text-[var(--accent)]">
			<PartyPopper size={20} />
		</div>
	</div>

	{#if total === 0}
		<p class="text-sm text-[var(--text-dim)]">No artist anniversaries within two weeks of today.</p>
	{:else}
		<div class="space-y-4">
			{#each [{ label: 'Today', items: groups.today }, { label: 'Upcoming', items: groups.upcoming }, { label: 'Recent', items: groups.past }] as section (section.label)}
				{#if section.items.length > 0}
					<div>
						<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">{section.label}</p>
						<div class="space-y-2">
							{#each section.items as entry, i (entry.artist)}
								<div
									class="stagger-item flex items-center gap-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5"
									class:stagger-visible={revealed}
									style="transition-delay:{revealed ? i * 60 : 0}ms"
								>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-[var(--text)]">{entry.artist}</p>
										<p class="text-xs text-[var(--text-dim)]">{yearsLabel(entry.years)} — {relativeLabel(entry)}</p>
									</div>
									<div class="shrink-0 text-right">
										<p class="font-mono text-sm font-bold text-[var(--text)]">{entry.count.toLocaleString()}</p>
										<p class="text-xs text-[var(--text-dim)]">scrobbles</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
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
