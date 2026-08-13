<script lang="ts">
	import { Hourglass } from '@lucide/svelte';

	let {
		artistGaps,
		trackGaps
	}: {
		artistGaps: Array<{ name: string; gapDays: number; count: number }>;
		trackGaps: Array<{ name: string; artist: string; gapDays: number; count: number }>;
	} = $props();

	function formatGap(days: number): string {
		if (days < 1) return '< 1 day';
		return `${Math.round(days)} days`;
	}
</script>

{#if artistGaps.length > 0 || trackGaps.length > 0}
	<div class="mb-6 grid gap-4 sm:mb-8 sm:gap-8 lg:grid-cols-2">
		{#if artistGaps.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<div>
						<h2 class="text-base font-semibold sm:text-lg">Biggest Silences — Artists</h2>
						<p class="text-xs text-[var(--text-dim)]">Longest gap between two listens of the same artist</p>
					</div>
					<div class="shrink-0 text-[var(--accent)]">
						<Hourglass size={18} />
					</div>
				</div>
				<ol class="space-y-2">
					{#each artistGaps as artist, i (artist.name)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">{artist.name}</span>
							<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{formatGap(artist.gapDays)}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}

		{#if trackGaps.length > 0}
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
				<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
					<div>
						<h2 class="text-base font-semibold sm:text-lg">Biggest Silences — Tracks</h2>
						<p class="text-xs text-[var(--text-dim)]">Longest gap between two listens of the same track</p>
					</div>
					<div class="shrink-0 text-[var(--accent)]">
						<Hourglass size={18} />
					</div>
				</div>
				<ol class="space-y-2">
					{#each trackGaps as track, i (i)}
						<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
							<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
							<span class="min-w-0 shrink truncate">
								<span class="font-medium">{track.name}</span>
								<span class="text-xs text-[var(--text-muted)] sm:text-sm"> — {track.artist}</span>
							</span>
							<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{formatGap(track.gapDays)}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>
{/if}
