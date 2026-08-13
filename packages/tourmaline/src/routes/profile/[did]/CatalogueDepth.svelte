<script lang="ts">
	import { Library } from '@lucide/svelte';

	let { artists }: { artists: Array<{ name: string; trackCount: number; count: number }> } = $props();
</script>

{#if artists.length > 0}
	<div class="mb-6 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
		<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
			<div>
				<h2 class="text-base font-semibold sm:text-lg">Deepest Catalogues</h2>
				<p class="text-xs text-[var(--text-dim)]">Artists you've explored the most distinct tracks from</p>
			</div>
			<div class="shrink-0 text-[var(--accent)]">
				<Library size={18} />
			</div>
		</div>
		<ol class="space-y-2">
			{#each artists as artist, i (artist.name)}
				<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
					<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
					<span class="min-w-0 shrink truncate">{artist.name}</span>
					<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{artist.trackCount} tracks</span>
				</li>
			{/each}
		</ol>
	</div>
{/if}
