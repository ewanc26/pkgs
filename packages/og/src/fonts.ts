/**
 * @ewanc26/og fonts
 *
 * Font loading utilities. Fonts are inlined as base64 at build time so this
 * works in serverless environments (Vercel, Netlify, etc.) without any
 * filesystem access to node_modules.
 */

import { INTER_BOLD_B64, INTER_REGULAR_B64 } from './fonts-base64.js'
import type { OgFontConfig } from './types.js'

// ─── Font Loading ──────────────────────────────────────────────────────────────

export interface LoadedFonts {
	heading: ArrayBuffer
	body: ArrayBuffer
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
	const buf = Buffer.from(b64, 'base64')
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

/**
 * Load fonts from config, falling back to the bundled Inter font.
 * If custom paths are provided they are loaded from disk; otherwise the
 * pre-inlined base64 data is used (safe in any serverless runtime).
 */
export async function loadFonts(config?: OgFontConfig): Promise<LoadedFonts> {
	if (config?.heading || config?.body) {
		const { readFile } = await import('node:fs/promises')
		const [headingBuf, bodyBuf] = await Promise.all([
			config.heading ? readFile(config.heading) : Buffer.from(INTER_BOLD_B64, 'base64'),
			config.body    ? readFile(config.body)    : Buffer.from(INTER_REGULAR_B64, 'base64'),
		])
		return {
			heading: headingBuf instanceof Buffer
				? (headingBuf.buffer.slice(headingBuf.byteOffset, headingBuf.byteOffset + headingBuf.byteLength) as ArrayBuffer)
				: headingBuf.buffer,
			body: bodyBuf instanceof Buffer
				? (bodyBuf.buffer.slice(bodyBuf.byteOffset, bodyBuf.byteOffset + bodyBuf.byteLength) as ArrayBuffer)
				: bodyBuf.buffer,
		}
	}

	return {
		heading: base64ToArrayBuffer(INTER_BOLD_B64),
		body:    base64ToArrayBuffer(INTER_REGULAR_B64),
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
 */
export function createSatoriFonts(fonts: LoadedFonts): SatoriFontConfig[] {
	return [
		{ name: 'Inter', data: fonts.heading, weight: 700, style: 'normal' },
		{ name: 'Inter', data: fonts.body,    weight: 400, style: 'normal' },
	]
}
