<script lang="ts">
	import { getThemedTextColor, getThemedAccent } from '$lib/utils/theme-helpers.js';

	interface Props {
		hasTheme?: boolean;
		opacity?: number;
		variant?: 'foreground' | 'accent';
		element?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
		class?: string;
		children?: any;
	}

	let {
		hasTheme = false,
		opacity = 100,
		variant = 'foreground',
		element = 'span',
		class: className = '',
		children
	}: Props = $props();

	const colorStyles = $derived(
		variant === 'accent' ? getThemedAccent(hasTheme) : getThemedTextColor(hasTheme, opacity)
	);

	// Default Tailwind classes when no theme
	const defaultClasses = $derived(() => {
		if (hasTheme) return '';

		if (variant === 'accent') {
			return 'text-primary-600 dark:text-primary-400';
		}

		switch (opacity) {
			case 100:
				return 'text-ink-900 dark:text-ink-50';
			case 80:
				return 'text-ink-800 dark:text-ink-100';
			case 70:
				return 'text-ink-700 dark:text-ink-200';
			case 60:
				return 'text-ink-600 dark:text-ink-400';
			case 50:
				return 'text-ink-500 dark:text-ink-500';
			default:
				return 'text-ink-700 dark:text-ink-200';
		}
	});
</script>

{#if element === 'p'}
	<p class="{defaultClasses()} {className}" style:color={colorStyles.color}>
		{@render children?.()}
	</p>
{:else if element === 'h1'}
	<h1 class="{defaultClasses()} {className}" style:color={colorStyles.color}>
		{@render children?.()}
	</h1>
{:else if element === 'h2'}
	<h2 class="{defaultClasses()} {className}" style:color={colorStyles.color}>
		{@render children?.()}
	</h2>
{:else if element === 'h3'}
	<h3 class="{defaultClasses()} {className}" style:color={colorStyles.color}>
		{@render children?.()}
	</h3>
{:else if element === 'div'}
	<div class="{defaultClasses()} {className}" style:color={colorStyles.color}>
		{@render children?.()}
	</div>
{:else}
	<span class="{defaultClasses()} {className}" style:color={colorStyles.color}>
		{@render children?.()}
	</span>
{/if}
