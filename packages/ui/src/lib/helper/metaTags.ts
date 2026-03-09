import type { SiteMetadata } from '../types/index.js';

/**
 * Generates an array of meta tag objects for use in a Svelte <svelte:head>.
 * Falls back to site defaults if a property is missing from `meta`.
 */
export function generateMetaTags(
	meta: SiteMetadata,
	defaults: SiteMetadata
): Array<Record<string, string>> {
	const finalMeta: SiteMetadata = {
		title: meta.title || defaults.title,
		description: meta.description || defaults.description,
		keywords: meta.keywords || defaults.keywords,
		url: meta.url || defaults.url,
		image: meta.image || defaults.image,
		imageWidth: meta.imageWidth || defaults.imageWidth,
		imageHeight: meta.imageHeight || defaults.imageHeight
	};

	return [
		{ name: 'description', content: finalMeta.description },
		{ name: 'keywords', content: finalMeta.keywords },

		{ property: 'og:type', content: 'website' },
		{ property: 'og:url', content: finalMeta.url },
		{ property: 'og:title', content: finalMeta.title },
		{ property: 'og:description', content: finalMeta.description },
		{ property: 'og:site_name', content: defaults.title },
		{ property: 'og:image', content: finalMeta.image },
		...(finalMeta.imageWidth
			? [{ property: 'og:image:width', content: finalMeta.imageWidth.toString() }]
			: []),
		...(finalMeta.imageHeight
			? [{ property: 'og:image:height', content: finalMeta.imageHeight.toString() }]
			: []),

		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:url', content: finalMeta.url },
		{ name: 'twitter:title', content: finalMeta.title },
		{ name: 'twitter:description', content: finalMeta.description },
		{ name: 'twitter:image', content: finalMeta.image }
	];
}

/**
 * Merges a defaults SiteMetadata object with optional overrides.
 * Use this to build per-page metadata from site-wide defaults.
 */
export function createSiteMeta(
	defaults: SiteMetadata,
	overrides: Partial<SiteMetadata> = {}
): SiteMetadata {
	return { ...defaults, ...overrides };
}
