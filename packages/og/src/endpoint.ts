/**
 * SvelteKit endpoint helpers.
 */

import { generateOgResponse } from './generate.js'
import type { OgEndpointOptions, OgGenerateOptions } from './types.js'

/**
 * Create a SvelteKit GET handler for OG image generation.
 *
 * @example
 * ```ts
 * // src/routes/og/[title]/+server.ts
 * import { createOgEndpoint } from '@ewanc26/og';
 *
 * export const GET = createOgEndpoint({
 *   siteName: 'ewancroft.uk',
 *   defaultTemplate: 'blog',
 * });
 * ```
 *
 * The endpoint expects query parameters:
 * - `title` (required): Page title
 * - `description`: Optional description
 * - `image`: Optional avatar/logo URL
 * - `seed`: Optional noise seed
 */
export function createOgEndpoint(options: OgEndpointOptions) {
	const {
		siteName,
		defaultTemplate: template = 'default',
		colors,
		fonts,
		noise,
		cacheMaxAge = 3600,
		width,
		height,
	} = options

	return async ({ url }: { url: URL }) => {
		const title = url.searchParams.get('title')
		const description = url.searchParams.get('description') ?? undefined
		const image = url.searchParams.get('image') ?? undefined
		const noiseSeed = url.searchParams.get('seed') ?? undefined
		const templateParam = url.searchParams.get('template') as 'blog' | 'profile' | 'default' | null
		const resolvedTemplate: OgGenerateOptions['template'] = templateParam ?? template

		if (!title) {
			return new Response('Missing title parameter', { status: 400 })
		}

		try {
			return await generateOgResponse(
				{
					title,
					description,
					siteName,
					image,
					template: resolvedTemplate,
					colors,
					fonts,
					noise,
					noiseSeed,
					width,
					height,
				},
				cacheMaxAge
			)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error('Failed to generate OG image:', error)
			return new Response(`Failed to generate image: ${errorMessage}`, { status: 500 })
		}
	}
}

/**
 * Create a typed OG image URL for use in meta tags.
 */
export function createOgImageUrl(
	baseUrl: string,
	params: {
		title: string
		description?: string
		image?: string
		seed?: string
	}
): string {
	const url = new URL(baseUrl)
	url.searchParams.set('title', params.title)
	if (params.description) url.searchParams.set('description', params.description)
	if (params.image) url.searchParams.set('image', params.image)
	if (params.seed) url.searchParams.set('seed', params.seed)
	return url.toString()
}
