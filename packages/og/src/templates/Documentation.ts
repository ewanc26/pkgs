/**
 * Documentation OG template.
 * Based on the legacy getOgTemplate from ewanc26/website.
 */

import type { OgTemplateProps } from '../types.js'

const USABLE_WIDTH = 1040
const AVG_CHAR_RATIO = 0.6

/**
 * Truncate `text` so it fits within `maxLines` lines at `fontSize`,
 * appending a unicode ellipsis if shortened.
 */
const truncateToFit = (
	text: string,
	fontSize: number,
	maxLines: number,
): string => {
	const charsPerLine = Math.floor(USABLE_WIDTH / (fontSize * AVG_CHAR_RATIO))
	const maxChars = charsPerLine * maxLines
	if (text.length <= maxChars) return text
	return text.slice(0, maxChars - 1).trimEnd() + '\u2026'
}

const dynamicFontSize = (
	text: string,
	maxLines: number,
	min: number,
	max: number,
): number =>
	Math.max(
		min,
		Math.min(
			max,
			Math.round((USABLE_WIDTH * maxLines) / (text.length * AVG_CHAR_RATIO)),
		),
	)

// Title: up to 3 lines, 38–80px
const getTitleFontSize = (title: string): number =>
	dynamicFontSize(title, 3, 38, 80)

// Subtitle: up to 2 lines, 24–40px
const getSubtitleFontSize = (subtitle: string): number =>
	dynamicFontSize(subtitle, 2, 24, 40)

export function documentationTemplate({
	title,
	description,
	siteName,
	colors,
	width,
	height,
}: OgTemplateProps) {
	const children = []

	// Only render title when provided
	if (title) {
		children.push({
			type: 'h1',
			props: {
				style: {
					fontSize: `${getTitleFontSize(title)}px`,
					fontWeight: 800,
					marginBottom: '20px',
					display: '-webkit-box',
					'-webkit-line-clamp': '3',
					'-webkit-box-orient': 'vertical',
					overflow: 'hidden',
					lineHeight: 1.15,
					color: colors.text,
				},
				children: title,
			},
		})
	}

	// Only render description (subtitle) when one was actually provided
	if (description) {
		const subtitleFontSize = getSubtitleFontSize(description)
		const displaySubtitle = truncateToFit(description, subtitleFontSize, 2)
		children.push({
			type: 'p',
			props: {
				style: {
					fontSize: `${subtitleFontSize}px`,
					color: colors.accent,
					display: '-webkit-box',
					'-webkit-line-clamp': '2',
					'-webkit-box-orient': 'vertical',
					overflow: 'hidden',
					lineHeight: 1.4,
				},
				children: displaySubtitle,
			},
		})
	}

	children.push(
		{
			type: 'div',
			props: {
				style: {
					marginTop: 'auto',
					fontSize: '20px',
					fontFamily: 'JetBrains Mono',
					color: colors.text,
				},
				children: siteName,
			},
		},
		// Pentacle Icon
		{
			type: 'svg',
			props: {
				width: '100',
				height: '100',
				viewBox: '0 0 12 12',
				style: {
					position: 'absolute',
					bottom: '80px',
					right: '80px',
					opacity: '0.1',
				},
				children: [
					{
						type: 'path',
						props: {
							d: 'M11 6A5 5 0 1 0 1 6a5 5 0 0 0 10 0ZM6 1l2.936 9.048-7.692-5.595h9.512l-7.692 5.595Z',
							stroke: colors.accent,
							fill: 'none',
							strokeWidth: '0.6',
							strokeLinecap: 'round',
							strokeLinejoin: 'round',
						},
					},
				],
			},
		},
	)

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				width,
				height,
				backgroundColor: colors.background,
				padding: '80px',
				justifyContent: 'center',
				color: colors.text,
				position: 'relative',
			},
			children,
		},
	}
}
