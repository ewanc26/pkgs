/**
 * @ewanc26/og noise
 */

import { generateNoisePixels } from '@ewanc26/noise'
import { PNGEncoder } from './png-encoder.js'
import type { OgNoiseConfig } from './types.js'

export interface NoiseOptions {
	seed: string
	width: number
	height: number
	opacity?: number
	colorMode?: OgNoiseConfig['colorMode']
}

export interface CircleNoiseOptions {
	seed: string
	size: number
	opacity?: number
	colorMode?: OgNoiseConfig['colorMode']
}

// Simple in-memory cache for noise textures
const noiseCache = new Map<string, string>()

/**
 * Generate a noise PNG as a data URL.
 */
export function generateNoiseDataUrl(options: NoiseOptions): string {
	const { seed, width, height, opacity = 0.4, colorMode = 'grayscale' } = options
	
	const cacheKey = `noise:${seed}:${width}:${height}:${opacity}:${colorMode}`
	if (noiseCache.has(cacheKey)) {
		return noiseCache.get(cacheKey)!
	}

	const pixels = generateNoisePixels(width, height, seed, {
		gridSize: 4,
		octaves: 3,
		colorMode: colorMode === 'grayscale'
			? { type: 'grayscale', range: [20, 60] }
			: { type: 'hsl', hueRange: 40, saturationRange: [30, 50], lightnessRange: [30, 50] }
	})

	if (opacity < 1) {
		for (let i = 3; i < pixels.length; i += 4) {
			pixels[i] = Math.round(pixels[i] * opacity)
		}
	}

	const pngBuffer = PNGEncoder.encode(pixels, width, height)
	const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
	
	noiseCache.set(cacheKey, dataUrl)
	return dataUrl
}

/**
 * Generate a circular noise PNG as a data URL.
 * Creates a square image with circular transparency mask.
 */
export function generateCircleNoiseDataUrl(options: CircleNoiseOptions): string {
	const { seed, size, opacity = 0.15, colorMode = 'grayscale' } = options

	const cacheKey = `circle:${seed}:${size}:${opacity}:${colorMode}`
	if (noiseCache.has(cacheKey)) {
		return noiseCache.get(cacheKey)!
	}

	const pixels = generateNoisePixels(size, size, seed, {
		gridSize: 4,
		octaves: 3,
		colorMode: colorMode === 'grayscale'
			? { type: 'grayscale', range: [30, 70] }
			: { type: 'hsl', hueRange: 40, saturationRange: [30, 50], lightnessRange: [30, 50] }
	})

	const center = size / 2
	const radius = size / 2

	// Apply circular mask
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const idx = (y * size + x) * 4
			const dx = x - center + 0.5
			const dy = y - center + 0.5
			const dist = Math.sqrt(dx * dx + dy * dy)

			if (dist > radius) {
				// Outside circle - fully transparent
				pixels[idx + 3] = 0
			} else if (dist > radius - 2) {
				// Anti-alias edge
				const edgeOpacity = (radius - dist) / 2
				pixels[idx + 3] = Math.round(255 * edgeOpacity * opacity)
			} else {
				// Inside circle - apply opacity
				pixels[idx + 3] = Math.round(255 * opacity)
			}
		}
	}

	const pngBuffer = PNGEncoder.encode(pixels, size, size)
	const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
	
	noiseCache.set(cacheKey, dataUrl)
	return dataUrl
}
