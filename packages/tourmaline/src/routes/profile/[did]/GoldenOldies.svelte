<script lang="ts">
	import { History, Sparkles } from '@lucide/svelte';

	let {
		goldenOldies,
		latestDiscoveries
	}: {
		goldenOldies: Array<{ name: string; avgDate: string; count: number }>;
		latestDiscoveries: Array<{ name: string; avgDate: string; count: number }>;
	} = $props();

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(undefined, {
			month: 'short',
			year: 'numeric'
		});
	}
</script>

{#if goldenOldies.length > 0 || latestDiscoveries.length > 0}
	<div class="mb-6 grid gap-4 sm:mb-8 sm:gap-8 lg:grid-cols-2">
		{#if goldenOldies.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<div>
						<h2 class="text-base font-semibold sm:text-lg">Golden Oldies</h2>
						<p class="text-xs text-[var(--text-dim)]">Steady favourites, weighted by when you actually listen to them</p>
					</div>
					<div class="shrink-0 text-[var(--accent)]"><History size={18} /></div>
				</div>
				<ol class="space-y-2">
					{#each goldenOldies as artist, i (artist.name)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">{artist.name}</span>
							<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{formatDate(artist.avgDate)}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}

		{#if latestDiscoveries.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<div>
						<h2 class="text-base font-semibold sm:text-lg">Latest Discoveries</h2>
						<p class="text-xs text-[var(--text-dim)]">Artists whose listening skews most recent</p>
					</div>
					<div class="shrink-0 text-[var(--accent)]"><Sparkles size={18} /></div>
				</div>
				<ol class="space-y-2">
					{#each latestDiscoveries as artist, i (artist.name)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">{artist.name}</span>
							<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{formatDate(artist.avgDate)}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>
{/if}
