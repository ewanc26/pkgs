<script lang="ts">
	import { Sparkles } from '@lucide/svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import type { Recommendation } from '$lib/analysis/recommendations';

	/**
	 * `loading` keeps skeleton rows visible while artist enrichment is still
	 * in progress — recommendations only exist for artists whose similar-artist
	 * data has already been fetched, so the real list grows in place as
	 * enrichment fills in rather than appearing all at once.
	 */
	let {
		recommendations,
		loading = false,
		target = 8
	}: { recommendations: Recommendation[]; loading?: boolean; target?: number } = $props();

	const shown = $derived(recommendations.slice(0, target));
	const skeletonCount = $derived(loading ? Math.max(0, target - shown.length) : 0);
</script>

{#if shown.length > 0 || loading}
	<div class="rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
		<div class="mb-4 flex items-center gap-2">
			<Sparkles size={15} class="text-[var(--accent)]" />
			<h2 class="text-base font-semibold sm:text-lg">You might like</h2>
		</div>
		<p class="-mt-2 mb-4 text-xs text-[var(--text-dim)]">
			Artists similar to ones you already listen to, that don't show up in your own scrobbles yet.
		</p>

		<ul class="grid gap-2 sm:grid-cols-2">
			{#each shown as rec (rec.name)}
				<li class="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-[var(--text)]">{rec.name}</p>
						<p class="truncate text-xs text-[var(--text-dim)]">
							because you listen to {rec.recommendedBy.slice(0, 2).join(', ')}{rec.recommendedBy.length > 2 ? ` +${rec.recommendedBy.length - 2} more` : ''}
						</p>
					</div>
					<span class="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-dim)]">
						{rec.score}
					</span>
				</li>
			{/each}

			{#each Array(skeletonCount) as _, i (i)}
				<li class="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
					<div class="min-w-0 flex-1">
						<Skeleton width="{60 + ((i * 13) % 30)}%" height="0.85rem" />
						<div class="mt-1.5">
							<Skeleton width="{40 + ((i * 17) % 35)}%" height="0.65rem" />
						</div>
					</div>
					<Skeleton width="1.5rem" height="1.1rem" rounded="rounded-full" />
				</li>
			{/each}
		</ul>
	</div>
{/if}
