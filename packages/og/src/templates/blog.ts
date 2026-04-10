/**
 * Blog OG template.
 * Clean centered layout.
 */

import type { OgTemplateProps } from '../types.js'

export function blogTemplate({
	title,
	description,
	siteName,
	colors,
	width,
	height,
}: OgTemplateProps) {
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
			children: [
				{
					type: 'h1',
					props: {
						style: {
							fontSize: 64,
							fontWeight: 700,
							color: colors.text,
							letterSpacing: '-0.02em',
							margin: 0,
							textAlign: 'center',
							lineHeight: 1.1,
							maxWidth: 1000,
						},
						children: title,
					},
				},
				description ? {
					type: 'p',
					props: {
						style: {
							fontSize: 28,
							fontWeight: 400,
							color: colors.accent,
							marginTop: 28,
							marginBottom: 0,
							textAlign: 'center',
							lineHeight: 1.4,
							maxWidth: 900,
						},
						children: description,
					},
				} : null,
				{
					type: 'p',
					props: {
						style: {
							fontSize: 24,
							fontWeight: 400,
							color: colors.accent,
							marginTop: 56,
							marginBottom: 0,
							textAlign: 'center',
							opacity: 0.7,
						},
						children: siteName,
					},
				},
			].filter(Boolean),
		},
	}
}
