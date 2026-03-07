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
	}

	let { theme, children, class: className = '', href }: Props = $props();

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
</script>

{#if href}
	<a {href} class="group block">
		<article
			class="rounded-lg border p-6 transition-all {className}"
			class:bg-canvas-50={!hasTheme}
			class:dark:bg-canvas-950={!hasTheme}
			class:border-canvas-200={!hasTheme}
			class:dark:border-canvas-800={!hasTheme}
			class:hover:border-primary-300={!hasTheme}
			class:dark:hover:border-primary-700={!hasTheme}
			class:focus-within:border-primary-300={!hasTheme}
			class:dark:focus-within:border-primary-700={!hasTheme}
			style:background-color={hasTheme ? 'var(--theme-background)' : undefined}
			style={allStyles()}
		>
			{@render children()}
		</article>
	</a>
{:else}
	<article
		class="rounded-lg border p-6 transition-all {className}"
		class:bg-canvas-50={!hasTheme}
		class:dark:bg-canvas-950={!hasTheme}
		class:border-canvas-200={!hasTheme}
		class:dark:border-canvas-800={!hasTheme}
		style:background-color={hasTheme ? 'var(--theme-background)' : undefined}
		style={allStyles()}
	>
		{@render children()}
	</article>
{/if}
