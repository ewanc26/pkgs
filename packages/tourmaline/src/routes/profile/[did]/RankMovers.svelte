<script lang="ts">
	import { ArrowUpRight, ArrowDownRight } from '@lucide/svelte';
	import type { RankMover } from '$lib/analysis/rank-history';

	let { climbers, fallers }: { climbers: RankMover[]; fallers: RankMover[] } = $props();
</script>

{#if climbers.length > 0 || fallers.length > 0}
	<div class="mb-6 grid gap-4 sm:mb-8 sm:gap-8 lg:grid-cols-2">
		{#if climbers.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<h2 class="text-base font-semibold sm:text-lg">Biggest Climbers</h2>
					<div class="shrink-0 text-green-500"><ArrowUpRight size={18} /></div>
				</div>
				<ol class="space-y-2">
					{#each climbers as artist, i (artist.name)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">{artist.name}</span>
							<span class="shrink-0 font-mono text-xs text-green-500 sm:text-sm">#{artist.fromRank} → #{artist.toRank}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}

		{#if fallers.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<h2 class="text-base font-semibold sm:text-lg">Biggest Fallers</h2>
					<div class="shrink-0 text-red-500"><ArrowDownRight size={18} /></div>
				</div>
				<ol class="space-y-2">
					{#each fallers as artist, i (artist.name)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">{artist.name}</span>
							<span class="shrink-0 font-mono text-xs text-red-500 sm:text-sm">#{artist.fromRank} → #{artist.toRank}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>
{/if}
