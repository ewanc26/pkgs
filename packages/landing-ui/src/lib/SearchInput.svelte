<script lang="ts">
	import { searchActors, type ActorResult } from '@ewanc26/utils/atproto/search';
	import { Search, Loader2 } from '@lucide/svelte';

	let { onSelect }: { onSelect: (actor: ActorResult) => void } = $props();

	let identifier = $state('');
	let suggestions = $state<ActorResult[]>([]);
	let showSuggestions = $state(false);
	let searchLoading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);

		const value = identifier.trim();
		if (value.length < 2 || value.startsWith('did:')) {
			suggestions = [];
			showSuggestions = false;
			return;
		}

		debounceTimer = setTimeout(async () => {
			searchLoading = true;
			suggestions = await searchActors(value);
			searchLoading = false;
			showSuggestions = suggestions.length > 0;
		}, 300);
	}

	function select(actor: ActorResult) {
		identifier = actor.handle;
		suggestions = [];
		showSuggestions = false;
		onSelect(actor);
	}
</script>

<div class="relative w-full">
	<div class="relative flex items-center">
		<Search size={16} class="absolute left-3 text-[var(--text-muted)]" />
		<input
			type="text"
			placeholder="Search actors..."
			bind:value={identifier}
			oninput={handleInput}
			class="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--accent)]"
		/>
		{#if searchLoading}
			<Loader2 size={16} class="absolute right-3 animate-spin text-[var(--text-muted)]" />
		{/if}
	</div>

	{#if showSuggestions}
		<div class="absolute mt-2 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50">
			{#each suggestions as actor (actor.did)}
				<button
					class="flex w-full items-center gap-3 p-3 text-left hover:bg-[var(--surface-2)]"
					onclick={() => select(actor)}
				>
					{#if actor.avatar}
						<img src={actor.avatar} alt="" class="h-8 w-8 rounded-full" />
					{:else}
						<div class="h-8 w-8 rounded-full bg-[var(--border)]"></div>
					{/if}
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">{actor.displayName ?? actor.handle}</p>
						<p class="truncate text-xs text-[var(--text-muted)]">@{actor.handle}</p>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
