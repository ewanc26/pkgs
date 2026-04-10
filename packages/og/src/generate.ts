/**
 * Core OG image generation.
 * Uses satori for JSX-to-SVG and resvg-js for SVG-to-PNG.
 */

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadFonts, createSatoriFonts } from './fonts.js'
import { generateNoiseDataUrl, generateCircleNoiseDataUrl } from './noise.js'
import { getTemplate } from './templates/index.js'
import { defaultColors } from './types.js'
import type {
	OgGenerateOptions,
	OgColorConfig,
	OgTemplateProps,
} from './types.js'

// Standard OG image dimensions
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/**
 * Generate an OG image as PNG Buffer.
 */
export async function generateOgImage(options: OgGenerateOptions): Promise<Buffer> {
	const {
		title,
		description,
		siteName,
		image,
		template = 'blog',
		colors: colorOverrides,
		fonts: fontConfig,
		noise: noiseConfig,
		noiseSeed,
		width = OG_WIDTH,
		height = OG_HEIGHT,
		debugSvg = false,
	} = options

	// Merge colours
	const colors: OgColorConfig = {
		...defaultColors,
		...colorOverrides,
	}

	// Load fonts
	const fonts = await loadFonts(fontConfig)
	const satoriFonts = createSatoriFonts(fonts)

	// Generate noise background
	const noiseEnabled = noiseConfig?.enabled === true
	const noiseSeedValue = noiseSeed || noiseConfig?.seed || title
	const noiseDataUrl = noiseEnabled
		? generateNoiseDataUrl({
				seed: noiseSeedValue,
				width,
				height,
				opacity: noiseConfig?.opacity ?? 0.4,
				colorMode: noiseConfig?.colorMode ?? 'grayscale',
			})
		: undefined

	// Generate circular noise decoration
	const circleNoiseDataUrl = noiseEnabled
		? generateCircleNoiseDataUrl({
				seed: `${noiseSeedValue}-circle`,
				size: 200,
				opacity: noiseConfig?.opacity ?? 0.15,
				colorMode: noiseConfig?.colorMode ?? 'grayscale',
			})
		: undefined

	// Get template function
	const templateFn = getTemplate(template as Parameters<typeof getTemplate>[0])

	// Build template props
	const props: OgTemplateProps = {
		title,
		description,
		siteName,
		image,
		colors,
		noiseDataUrl,
		circleNoiseDataUrl,
		width,
		height,
	}

	// Render template to Satori-compatible structure
	const element = templateFn(props)

	// Generate SVG with satori
	const svg = await satori(element as Parameters<typeof satori>[0], {
		width,
		height,
		fonts: satoriFonts,
	})

	// Debug: return SVG string
	if (debugSvg) {
		return Buffer.from(svg)
	}

	// Convert SVG to PNG with resvg-js
	const resvg = new Resvg(svg, {
		fitTo: {
			mode: 'width',
			value: width,
		},
	})
	const pngData = resvg.render()

	return Buffer.from(pngData.asPng())
}

/**
 * Generate OG image and return as base64 data URL.
 */
export async function generateOgImageDataUrl(options: OgGenerateOptions): Promise<string> {
	const png = await generateOgImage(options)
	return `data:image/png;base64,${png.toString('base64')}`
}

/**
 * Generate OG image and return as Response (for SvelteKit endpoints).
 */
export async function generateOgResponse(options: OgGenerateOptions, cacheMaxAge = 3600): Promise<Response> {
	const png = await generateOgImage(options)

	return new Response(png, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': `public, max-age=${cacheMaxAge}`,
		},
	})
}
