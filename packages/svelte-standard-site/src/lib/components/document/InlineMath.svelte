<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		tex: string;
		hasTheme?: boolean;
	}

	const { tex, hasTheme = false }: Props = $props();

	let mathContainer = $state<HTMLSpanElement>();
	let renderError = $state<string | null>(null);

	onMount(async () => {
		try {
			// Dynamically import KaTeX
			const katex = await import('katex');
			await import('katex/dist/katex.min.css');

			if (mathContainer) {
				katex.default.render(tex, mathContainer, {
					displayMode: false, // Inline mode
					throwOnError: false,
					errorColor: '#ef4444',
					trust: false
				});
			}
		} catch (error) {
			console.error('Failed to render inline LaTeX:', error);
			renderError = error instanceof Error ? error.message : 'Failed to render LaTeX';
		}
	});
</script>

{#if renderError}
	<span class="rounded bg-red-100 px-1 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400"
		>Error: {tex}</span
	>
{:else}
	<span bind:this={mathContainer} class="inline-block align-middle"></span>
{/if}
