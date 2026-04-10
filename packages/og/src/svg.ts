/**
 * SVG to PNG conversion using @resvg/resvg-js.
 */

import { Resvg } from '@resvg/resvg-js'

export interface SvgToPngOptions {
	/** Scale to fit width in pixels */
	fitWidth?: number
	/** Background colour for transparent areas */
	backgroundColor?: string
}

/**
 * Convert an SVG string to PNG Buffer.
 */
export function svgToPng(svg: string, options: SvgToPngOptions = {}): Buffer {
	const opts = {
		fitTo: options.fitWidth
			? { mode: 'width' as const, value: options.fitWidth }
			: undefined,
		background: options.backgroundColor,
	}

	const resvg = new Resvg(svg, opts)
	const rendered = resvg.render()

	return Buffer.from(rendered.asPng())
}

/**
 * Convert an SVG string to PNG data URL.
 */
export function svgToPngDataUrl(svg: string, options: SvgToPngOptions = {}): string {
	const png = svgToPng(svg, options)
	return `data:image/png;base64,${png.toString('base64')}`
}

/**
 * Convert an SVG string to PNG Response (for SvelteKit endpoints).
 */
export function svgToPngResponse(svg: string, options: SvgToPngOptions = {}, cacheMaxAge = 3600): Response {
	const png = svgToPng(svg, options)

	return new Response(png, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': `public, max-age=${cacheMaxAge}`,
		},
	})
}
