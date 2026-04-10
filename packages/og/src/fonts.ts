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

// Google Fonts CDN fallback URLs
const FONT_FALLBACKS = {
	heading: 'https://github.com/rsms/inter/raw/refs/heads/main/docs/font-files/Inter-Bold.ttf',
	body: 'https://github.com/rsms/inter/raw/refs/heads/main/docs/font-files/Inter-Regular.ttf',
}

// ─── Font Loading ──────────────────────────────────────────────────────────────

export interface LoadedFonts {
	heading: ArrayBuffer
	body: ArrayBuffer
}

/**
 * Load fonts from config, falling back to bundled fonts,
 * with CDN fallback for serverless environments.
 */
export async function loadFonts(config?: OgFontConfig): Promise<LoadedFonts> {
	const headingPath = config?.heading ?? BUNDLED_FONTS.heading
	const bodyPath = config?.body ?? BUNDLED_FONTS.body

	const [heading, body] = await Promise.all([
		loadFontFileWithFallback(headingPath, FONT_FALLBACKS.heading),
		loadFontFileWithFallback(bodyPath, FONT_FALLBACKS.body),
	])

	return { heading, body }
}

/**
 * Load a font file, falling back to CDN if local file fails.
 */
async function loadFontFileWithFallback(path: string, fallbackUrl: string): Promise<ArrayBuffer> {
	try {
		return await loadFontFile(path)
	} catch (error) {
		console.warn(`Failed to load local font at ${path}, trying CDN fallback:`, error)
		try {
			return await loadFontFile(fallbackUrl)
		} catch (fallbackError) {
			throw new Error(`Failed to load font from both local path (${path}) and CDN (${fallbackUrl}): ${fallbackError}`)
		}
	}
}

/**
 * Load a font from file path or URL.
 */
async function loadFontFile(source: string): Promise<ArrayBuffer> {
	// Handle URLs
	if (source.startsWith('http://') || source.startsWith('https://')) {
		const response = await fetch(source)
		if (!response.ok) {
			throw new Error(`Failed to load font from URL: ${source}`)
		}
		return response.arrayBuffer()
	}

	// Handle file paths
	const buffer = await readFile(source)
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
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
