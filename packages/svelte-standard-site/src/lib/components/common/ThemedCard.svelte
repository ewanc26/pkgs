<script lang="ts">
	import type { BasicTheme } from '$lib/types.js';
	import { getThemeVars } from '$lib/utils/theme.js';
	import { getThemedBorder } from '$lib/utils/theme-helpers.js';
	import type { Snippet } from 'svelte';

	interface Props {
		theme?: BasicTheme;
		children: Snippet;
		class?: string;
		href?: string;
		/**
		 * If true, renders only the themed wrapper without default styles.
		 * Useful for custom layouts — pass your own classes via `class`.
		 */
		headless?: boolean;
	}

	let { theme, children, class: className = '', href, headless = false }: Props = $props();

	const themeVars = $derived(theme ? getThemeVars(theme) : {});
	const hasTheme = $derived(!!theme);
	const borderStyles = $derived(getThemedBorder(hasTheme));

	const styles = $derived(
		Object.entries(themeVars)
			.map(([k, v]) => `${k}:${v}`)
			.join(';')
	);

	const allStyles = $derived(() => {
		const base = styles;
		if (borderStyles.borderColor) {
			return `${base};border-color:${borderStyles.borderColor}`;
		}
		return base;
	});

	// Default styles for non-headless mode
	const defaultStyles = $derived(
		headless
			? ''
			: 'rounded-lg border p-6 transition-all bg-canvas-50 dark:bg-canvas-950 border-canvas-200 dark:border-canvas-800 hover:border-primary-300 dark:hover:border-primary-700 focus-within:border-primary-300 dark:focus-within:border-primary-700'
	);
</script>

{#if href}
	<a {href} class="group block">
		<article
			class="{defaultStyles} {className}"
			style:background-color={hasTheme ? 'var(--theme-background)' : undefined}
			style={allStyles()}
		>
			{@render children()}
		</article>
	</a>
{:else}
	<article
		class="{defaultStyles} {className}"
		style:background-color={hasTheme ? 'var(--theme-background)' : undefined}
		style={allStyles()}
	>
		{@render children()}
	</article>
{/if}
