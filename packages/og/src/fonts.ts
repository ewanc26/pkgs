/**
 * @ewanc26/og fonts
 *
 * Font loading utilities. Bundles Inter font by default.
 */

import { readFile } from 'node:fs/promises'
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
 */
function getFontsDir(): string {
	return resolve(getModuleDir(), '../fonts')
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
 * Load fonts from config, falling back to bundled DM Sans.
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
