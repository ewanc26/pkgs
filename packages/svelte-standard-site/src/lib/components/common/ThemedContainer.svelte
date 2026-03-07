<script lang="ts">
	import type { BasicTheme } from '$lib/types.js';
	import { getThemeVars } from '$lib/utils/theme.js';
	import type { Snippet } from 'svelte';

	interface Props {
		theme?: BasicTheme;
		children: Snippet;
		class?: string;
		element?: 'div' | 'article' | 'section';
	}

	let { theme, children, class: className = '', element = 'div' }: Props = $props();

	const themeVars = $derived(theme ? getThemeVars(theme) : {});
	const hasTheme = $derived(!!theme);

	const styles = $derived(
		Object.entries(themeVars)
			.map(([k, v]) => `${k}:${v}`)
			.join(';')
	);
</script>

{#if element === 'article'}
	<article
		class={className}
		class:bg-canvas-50={!hasTheme}
		class:dark:bg-canvas-950={!hasTheme}
		style:background-color={hasTheme ? 'var(--theme-background)' : undefined}
		style={styles}
	>
		{@render children()}
	</article>
{:else if element === 'section'}
	<section
		class={className}
		class:bg-canvas-50={!hasTheme}
		class:dark:bg-canvas-950={!hasTheme}
		style:background-color={hasTheme ? 'var(--theme-background)' : undefined}
		style={styles}
	>
		{@render children()}
	</section>
{:else}
	<div
		class={className}
		class:bg-canvas-50={!hasTheme}
		class:dark:bg-canvas-950={!hasTheme}
		style:background-color={hasTheme ? 'var(--theme-background)' : undefined}
		style={styles}
	>
		{@render children()}
	</div>
{/if}
