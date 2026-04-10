/**
 * Profile OG template.
 * Centered layout.
 */

import type { OgTemplateProps } from '../types.js'

export function profileTemplate({
	title,
	description,
	siteName,
	image,
	colors,
	width,
	height,
}: OgTemplateProps) {
	const children: unknown[] = []

	if (image) {
		children.push({
			type: 'img',
			props: {
				src: image,
				width: 120,
				height: 120,
				style: {
					borderRadius: '50%',
					marginBottom: 32,
					objectFit: 'cover',
				},
			},
		})
	}

	children.push({
		type: 'h1',
		props: {
			style: {
				fontSize: 56,
				fontWeight: 700,
				color: colors.text,
				letterSpacing: '-0.02em',
				margin: 0,
				textAlign: 'center',
				lineHeight: 1.1,
				maxWidth: 900,
			},
			children: title,
		},
	})

	if (description) {
		children.push({
			type: 'p',
			props: {
				style: {
					fontSize: 26,
					fontWeight: 400,
					color: colors.accent,
					marginTop: 20,
					marginBottom: 0,
					textAlign: 'center',
					lineHeight: 1.4,
					maxWidth: 700,
				},
				children: description,
			},
		})
	}

	children.push({
		type: 'p',
		props: {
			style: {
				fontSize: 24,
				fontWeight: 400,
				color: colors.accent,
				marginTop: 48,
				marginBottom: 0,
				textAlign: 'center',
				opacity: 0.7,
			},
			children: siteName,
		},
	})

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width,
				height,
				backgroundColor: colors.background,
			},
			children,
		},
	}
}
