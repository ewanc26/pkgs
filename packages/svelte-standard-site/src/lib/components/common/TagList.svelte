<script lang="ts">
	import { getThemedAccent } from '$lib/utils/theme-helpers.js';

	interface Props {
		tags: string[];
		hasTheme?: boolean;
		class?: string;
	}

	let { tags, hasTheme = false, class: className = '' }: Props = $props();

	const accentStyles = $derived(getThemedAccent(hasTheme, 20));
</script>

{#if tags.length > 0}
	<div class="flex flex-wrap gap-2 {className}">
		{#each tags as tag}
			<span
				class="rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105"
				class:bg-primary-50={!hasTheme}
				class:text-primary-700={!hasTheme}
				class:dark:bg-primary-950={!hasTheme}
				class:dark:text-primary-300={!hasTheme}
				style:background-color={accentStyles.backgroundColor}
				style:color={hasTheme ? accentStyles.color : undefined}
			>
				#{tag}
			</span>
		{/each}
	</div>
{/if}
