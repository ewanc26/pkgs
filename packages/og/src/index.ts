/**
 * @ewanc26/og
 *
 * Dynamic OpenGraph image generator with noise backgrounds, bold typography,
 * and Satori-based rendering. Works in SvelteKit endpoints, edge runtimes,
 * and build scripts.
 *
 * @example
 * ```ts
 * import { generateOgImage, createOgEndpoint } from '@ewanc26/og';
 * import { blogTemplate } from '@ewanc26/og/templates';
 *
 * // Generate PNG
 * const png = await generateOgImage({
 *   title: 'My Blog Post',
 *   description: 'A description',
 *   siteName: 'ewancroft.uk',
 * });
 *
 * // SvelteKit endpoint
 * export const GET = createOgEndpoint({ siteName: 'ewancroft.uk' });
 * ```
 */

// Core generation
export { generateOgImage, generateOgImageDataUrl, generateOgResponse, OG_WIDTH, OG_HEIGHT } from './generate.js'

// Types
export type {
	OgColorConfig,
	OgFontConfig,
	OgNoiseConfig,
	OgTemplateProps,
	OgTemplate,
	OgGenerateOptions,
	OgEndpointOptions,
} from './types.js'
export { defaultColors } from './types.js'

// Noise (for advanced customization)
export { generateNoiseDataUrl, generateCircleNoiseDataUrl } from './noise.js'

// Fonts (for advanced customization)
export { loadFonts, createSatoriFonts, BUNDLED_FONTS } from './fonts.js'

// Endpoint helpers
export { createOgEndpoint } from './endpoint.js'

// SVG to PNG conversion
export { svgToPng, svgToPngDataUrl, svgToPngResponse } from './svg.js'
export type { SvgToPngOptions } from './svg.js'
