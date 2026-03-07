<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		block: {
			plaintext: string;
			language?: string;
			syntaxHighlightingTheme?: string;
		};
		hasTheme?: boolean;
		prerenderedCode?: string;
	}

	const { block, hasTheme = false, prerenderedCode }: Props = $props();

	let html = $state<string | null>(null);

	onMount(async () => {
		// Use prerendered code if available
		if (prerenderedCode) {
			html = prerenderedCode;
			return;
		}

		try {
			const { codeToHtml, bundledLanguagesInfo, bundledThemesInfo } = await import('shiki');

			const lang =
				bundledLanguagesInfo.find((l: any) => l.id === block.language)?.id || 'plaintext';
			const theme =
				bundledThemesInfo.find((t: any) => t.id === block.syntaxHighlightingTheme)?.id ||
				'github-light';

			html = await codeToHtml(block.plaintext, { lang, theme });
		} catch (error) {
			console.error('Failed to highlight code:', error);
			// Fallback to plain text
			html = `<pre><code>${block.plaintext}</code></pre>`;
		}
	});
</script>

{#if html}
	<div
		class="my-2 min-h-[42px] w-full rounded-md border"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		{@html html}
	</div>
{:else}
	<div
		class="my-2 min-h-[42px] w-full rounded-md border"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<pre class="p-4"><code>{block.plaintext}</code></pre>
	</div>
{/if}

<style>
	:global(.shiki) {
		padding: 1rem;
		overflow-x: auto;
	}
</style>
