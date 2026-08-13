<script lang="ts">
	import { Info } from '@lucide/svelte';
	import { buildListeningContext } from '$lib/analysis/listening-context';
	import type { ListenerProfile } from '$lib/types';

	let { profile }: { profile: ListenerProfile } = $props();

	const entries = $derived(buildListeningContext(profile));
</script>

{#if entries.length > 0}
	<div class="rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
		<h2 class="mb-1 text-base font-semibold sm:text-lg">Where you sit</h2>
		<p class="mb-4 flex items-start gap-1.5 text-xs text-[var(--text-dim)]">
			<Info size={12} class="mt-0.5 shrink-0" />
			<span>
				Framed against each score's own scale and commonly-cited listening-time ranges — tourmaline
				doesn't track other listeners, so this isn't a live ranking against real people.
			</span>
		</p>
		<ul class="grid gap-3 sm:grid-cols-3">
			{#each entries as entry (entry.label)}
				<li class="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
					<p class="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--accent-dim)] opacity-70">{entry.label}</p>
					<p class="mt-1 text-sm font-semibold text-[var(--text)]">{entry.tier}</p>
					<p class="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{entry.detail}</p>
				</li>
			{/each}
		</ul>
	</div>
{/if}
