/**
 * Core OG image generation.
 * Uses satori for JSX-to-SVG and resvg-js for SVG-to-PNG.
 */

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { head, put } from '@vercel/blob'
import { createHash } from 'node:crypto'
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
 * Generate a deterministic hash for the options to use as a blob key.
 */
function getOptionsHash(options: OgGenerateOptions): string {
	const str = JSON.stringify({
		title: options.title,
		description: options.description,
		siteName: options.siteName,
		image: options.image,
		template: options.template || 'blog',
		colors: options.colors,
		noise: options.noise,
		width: options.width || OG_WIDTH,
		height: options.height || OG_HEIGHT,
	})
	return createHash('sha256').update(str).digest('hex')
}

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

	// Check Vercel Blob if not in debug mode
	const hash = getOptionsHash(options)
	const blobPath = `og-cache/${hash}.png`
	
	if (!debugSvg && process.env.BLOB_READ_WRITE_TOKEN) {
		try {
			const blobUrl = `https://${process.env.VERCEL_BLOB_STORE_ID}.public.blob.vercel-storage.com/${blobPath}`
			const existingBlob = await head(blobUrl).catch(() => null)
			if (existingBlob) {
				const response = await fetch(blobUrl)
				if (response.ok) {
					const arrayBuffer = await response.arrayBuffer()
					return Buffer.from(arrayBuffer)
				}
			}
		} catch (e) {
			console.error('Failed to check Vercel Blob:', e)
		}
	}

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
	const buffer = Buffer.from(pngData.asPng())

	// Store in Vercel Blob if token is available
	if (process.env.BLOB_READ_WRITE_TOKEN) {
		try {
			await put(blobPath, buffer, {
				access: 'public',
				contentType: 'image/png',
				addRandomSuffix: false,
			})
		} catch (e) {
			console.error('Failed to store in Vercel Blob:', e)
		}
	}

	return buffer
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
