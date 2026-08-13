<script lang="ts">
	import { CalendarCheck } from '@lucide/svelte';

	let {
		everyYear,
		everyCompletedYear
	}: {
		everyYear: Array<{ name: string; count: number }>;
		everyCompletedYear: Array<{ name: string; count: number }>;
	} = $props();

	let showCompletedOnly = $state(true);
	const list = $derived(showCompletedOnly && everyCompletedYear.length > 0 ? everyCompletedYear : everyYear);
</script>

{#if everyYear.length > 0}
	<div class="mb-6 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
		<div class="mb-3 flex items-start justify-between gap-4 sm:mb-4">
			<div>
				<h2 class="text-base font-semibold sm:text-lg">Every-Year Artists</h2>
				<p class="text-xs text-[var(--text-dim)]">
					Artists you've scrobbled in {showCompletedOnly ? 'every completed calendar year' : 'every calendar year'} of your history
				</p>
			</div>
			<div class="shrink-0 text-[var(--accent)]"><CalendarCheck size={18} /></div>
		</div>

		{#if everyCompletedYear.length > 0}
			<div class="mb-3 flex gap-1.5 text-xs">
				<button
					class="rounded border px-2 py-1 transition-colors {showCompletedOnly ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}"
					onclick={() => (showCompletedOnly = true)}
				>
					Completed years
				</button>
				<button
					class="rounded border px-2 py-1 transition-colors {!showCompletedOnly ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}"
					onclick={() => (showCompletedOnly = false)}
				>
					All years
				</button>
			</div>
		{/if}

		{#if list.length === 0}
			<p class="text-sm text-[var(--text-dim)]">No artists span every completed year yet.</p>
		{:else}
			<ol class="space-y-2">
				{#each list.slice(0, 20) as artist, i (artist.name)}
					<li class="flex items-center gap-2 overflow-hidden sm:gap-3">
						<span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
						<span class="min-w-0 shrink truncate">{artist.name}</span>
						<span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{artist.count.toLocaleString()}</span>
					</li>
				{/each}
			</ol>
			{#if list.length > 20}
				<p class="mt-2 text-xs text-[var(--text-dim)]">+{list.length - 20} more</p>
			{/if}
		{/if}
	</div>
{/if}
