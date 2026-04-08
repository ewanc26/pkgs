<script lang="ts">
	import { onMount } from 'svelte';
	import type { BasicTheme, ExtendedTheme, BackgroundImage } from '$lib/types.js';
	import {
		anyThemeToCssVars,
		getBackgroundImageStyles,
		getFontStyles,
		getPageWidthStyles
	} from '$lib/utils/theme-helpers.js';
	import { getGoogleFontsUrl } from '$lib/utils/theme.js';

	interface Props {
		theme?: BasicTheme | ExtendedTheme;
		/** Child content */
		children: import('svelte').Snippet;
		/** Whether to apply the theme */
		applyTheme?: boolean;
		/** CSS class for the container */
		class?: string;
	}

	const { theme, children, applyTheme = true, class: className = '' }: Props = $props();

	// Get the Google Fonts URL if custom fonts are specified
	const googleFontsUrl = $derived(
		theme && 'headingFont' in theme
			? getGoogleFontsUrl({
					headingFont: (theme as ExtendedTheme).headingFont,
					bodyFont: (theme as ExtendedTheme).bodyFont
				})
			: null
	);

	// Background image styles
	const bgImageStyles = $derived(
		theme && 'backgroundImage' in theme
			? getBackgroundImageStyles((theme as ExtendedTheme).backgroundImage)
			: {}
	);

	// Page width styles
	const pageWidthStyles = $derived(
		theme && 'pageWidth' in theme
			? getPageWidthStyles(theme as ExtendedTheme)
			: {}
	);

	// Font styles
	const fontStyles = $derived(
		theme && 'bodyFont' in theme
			? getFontStyles(theme as ExtendedTheme)
			: {}
	);

	// Theme CSS variables
	const themeVars = $derived(applyTheme ? anyThemeToCssVars(theme) : {});

	// Load Google Fonts on mount
	onMount(() => {
		if (googleFontsUrl) {
			// Check if font link already exists
			const existingLink = document.querySelector(`link[href="${googleFontsUrl}"]`);
			if (!existingLink) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = googleFontsUrl;
				document.head.appendChild(link);
			}
		}
	});
</script>

<div
	class="theme-provider {className}"
	style:bg-image={bgImageStyles.backgroundImage ? 'url' : undefined}
	style={Object.entries({ ...themeVars, ...fontStyles, ...pageWidthStyles })
		.map(([k, v]) => `${k}: ${v}`)
		.join('; ')}
>
	{#if googleFontsUrl}
		<!-- Google Fonts will be loaded via onMount -->
	{/if}

	{@render children()}
</div>

<style>
	.theme-provider {
		min-height: 100%;
		width: 100%;
	}
</style>
