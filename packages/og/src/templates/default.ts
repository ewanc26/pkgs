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
	noiseDataUrl,
	width,
	height,
}: OgTemplateProps) {
	return {
		type: 'div',
		props: {
			style: {
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width,
				height,
				backgroundColor: colors.background,
			},
			children: [
				noiseDataUrl ? {
					type: 'img',
					props: {
						src: noiseDataUrl,
						width,
						height,
						style: {
							position: 'absolute',
							top: 0,
							left: 0,
							width,
							height,
						},
					},
				} : null,
				{
					type: 'div',
					props: {
						style: {
							position: 'relative',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							width,
							height,
							padding: '0 60px',
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
				},
			].filter(Boolean),
		},
	}
}
