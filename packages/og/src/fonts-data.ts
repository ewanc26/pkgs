/**
 * Font loading helper for serverless environments
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Declare __dirname for CJS contexts (injected by bundlers)
declare const __dirname: string | undefined

function getModuleDir(): string {
	if (typeof import.meta !== 'undefined' && import.meta.url) {
		return dirname(fileURLToPath(import.meta.url))
	}
	if (typeof __dirname !== 'undefined') {
		return __dirname
	}
	return resolve(process.cwd(), 'node_modules/@ewanc26/og/dist')
}

export interface FontData {
	heading: ArrayBuffer
	body: ArrayBuffer
}

/**
 * Try loading fonts from dist/fonts directory
 */
export async function loadEmbeddedFonts(): Promise<FontData | null> {
	const moduleDir = getModuleDir()

	const paths = [
		{
			heading: resolve(moduleDir, 'fonts/Inter-Bold.ttf'),
			body: resolve(moduleDir, 'fonts/Inter-Regular.ttf'),
		},
		{
			heading: resolve(moduleDir, '../fonts/Inter-Bold.ttf'),
			body: resolve(moduleDir, '../fonts/Inter-Regular.ttf'),
		},
	]

	for (const p of paths) {
		try {
			const [headingBuf, bodyBuf] = await Promise.all([
				readFile(p.heading),
				readFile(p.body),
			])
			// Convert Buffer to ArrayBuffer
			return {
				heading: headingBuf.buffer.slice(headingBuf.byteOffset, headingBuf.byteOffset + headingBuf.byteLength),
				body: bodyBuf.buffer.slice(bodyBuf.byteOffset, bodyBuf.byteOffset + bodyBuf.byteLength),
			}
		} catch {
			continue
		}
	}

	return null
}
