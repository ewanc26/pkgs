/**
 * Default OG template.
 * Clean, centered layout.
 */

import type { OgTemplateProps } from '../types.js'

export function defaultTemplate({
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
							fontSize: 72,
							fontWeight: 700,
							color: colors.text,
							letterSpacing: '-0.02em',
							margin: 0,
							textAlign: 'center',
						},
						children: title,
					},
				},
				description ? {
					type: 'p',
					props: {
						style: {
							fontSize: 32,
							fontWeight: 400,
							color: colors.accent,
							marginTop: 24,
							marginBottom: 0,
							textAlign: 'center',
							maxWidth: 900,
						},
						children: description,
					},
				} : null,
				{
					type: 'p',
					props: {
						style: {
							fontSize: 28,
							fontWeight: 400,
							color: colors.accent,
							marginTop: 64,
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
