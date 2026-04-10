/**
 * @ewanc26/og fonts
 *
 * Font loading utilities. Bundles Inter font by default.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { OgFontConfig } from './types.js'

// Declare __dirname for CJS contexts (injected by bundlers)
declare const __dirname: string | undefined

// ─── Paths ────────────────────────────────────────────────────────────────────

/**
 * Get the directory of the current module.
 * Works in both ESM and bundled contexts.
 */
function getModuleDir(): string {
	// ESM context
	if (typeof import.meta !== 'undefined' && import.meta.url) {
		return dirname(fileURLToPath(import.meta.url))
	}
	// Bundled CJS context - __dirname is injected by bundlers
	if (typeof __dirname !== 'undefined') {
		return __dirname
	}
	// Fallback
	return resolve(process.cwd(), 'node_modules/@ewanc26/og/dist')
}

/**
 * Resolve the fonts directory relative to the installed package.
 * Tries multiple possible locations for serverless compatibility.
 */
function getFontsDir(): string {
	const candidates = [
		// Standard: fonts next to dist
		resolve(getModuleDir(), '../fonts'),
		// Vercel serverless: fonts inside dist
		resolve(getModuleDir(), 'fonts'),
		// Fallback: node_modules path
		resolve(process.cwd(), 'node_modules/@ewanc26/og/fonts'),
	]

	for (const dir of candidates) {
		if (existsSync(dir)) {
			return dir
		}
	}

	// Return first candidate as fallback (will fail gracefully)
	return candidates[0]
}

/**
 * Resolve bundled font paths. Uses getters to defer resolution until runtime.
 */
export const BUNDLED_FONTS = {
	get heading() {
		return resolve(getFontsDir(), 'Inter-Bold.ttf')
	},
	get body() {
		return resolve(getFontsDir(), 'Inter-Regular.ttf')
	},
} as const

// ─── Font Loading ──────────────────────────────────────────────────────────────

export interface LoadedFonts {
	heading: ArrayBuffer
	body: ArrayBuffer
}

/**
 * Load fonts from config, falling back to bundled fonts.
 * In serverless environments, falls back to fetching from upstream CDN.
 */
export async function loadFonts(config?: OgFontConfig): Promise<LoadedFonts> {
	const headingPath = config?.heading ?? BUNDLED_FONTS.heading
	const bodyPath = config?.body ?? BUNDLED_FONTS.body

	const [heading, body] = await Promise.all([
		loadFontFile(headingPath),
		loadFontFile(bodyPath),
	])

	return { heading, body }
}

/**
 * Load a font from file path.
 * Falls back to fetching from github raw if local file not found.
 */
async function loadFontFile(source: string): Promise<ArrayBuffer> {
	try {
		const buffer = await readFile(source)
		return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
	} catch (error) {
		// In serverless, fonts might not be at expected path - fetch from CDN
		const filename = source.split('/').pop()
		const cdnUrl = `https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/${filename}`

		try {
			const response = await fetch(cdnUrl)
			if (!response.ok) {
				throw new Error(`CDN fetch failed: ${response.status}`)
			}
			return response.arrayBuffer()
		} catch (cdnError) {
			throw new Error(`Failed to load font ${filename} from both local path and CDN: ${cdnError}`)
		}
	}
}

// ─── Font Registration for Satori ─────────────────────────────────────────────

export type SatoriFontConfig = {
	name: string
	data: ArrayBuffer
	weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
	style: 'normal' | 'italic'
}

/**
 * Create Satori-compatible font config from loaded fonts.
 * Uses Inter font family with weight 700 for headings and 400 for body.
 */
export function createSatoriFonts(fonts: LoadedFonts): SatoriFontConfig[] {
	return [
		{
			name: 'Inter',
			data: fonts.heading,
			weight: 700,
			style: 'normal',
		},
		{
			name: 'Inter',
			data: fonts.body,
			weight: 400,
			style: 'normal',
		},
	]
}
