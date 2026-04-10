/**
 * @ewanc26/og types
 */

// ─── Colour Configuration ─────────────────────────────────────────────────────

export interface OgColorConfig {
	/** Background color (very dark). @default '#0f1a15' */
	background: string
	/** Primary text color. @default '#e8f5e9' */
	text: string
	/** Secondary/accent text (mint). @default '#86efac' */
	accent: string
}

export const defaultColors: OgColorConfig = {
	background: '#0f1a15',
	text: '#e8f5e9',
	accent: '#86efac',
}

// ─── Font Configuration ───────────────────────────────────────────────────────

export interface OgFontConfig {
	heading?: string
	body?: string
}

// ─── Noise Configuration ──────────────────────────────────────────────────────

export interface OgNoiseConfig {
	enabled?: boolean
	seed?: string
	opacity?: number
	colorMode?: 'grayscale' | 'hsl'
}

// ─── Template Props ────────────────────────────────────────────────────────────

export interface OgTemplateProps {
	title: string
	description?: string
	siteName: string
	image?: string
	colors: OgColorConfig
	noiseDataUrl?: string
	circleNoiseDataUrl?: string
	width: number
	height: number
}

export type OgTemplate = (props: OgTemplateProps) => unknown

// ─── Generation Options ───────────────────────────────────────────────────────

export interface OgGenerateOptions {
	title: string
	description?: string
	siteName: string
	image?: string
	template?: 'blog' | 'profile' | 'default' | OgTemplate
	colors?: Partial<OgColorConfig>
	fonts?: OgFontConfig
	noise?: OgNoiseConfig
	noiseSeed?: string
	width?: number
	height?: number
	debugSvg?: boolean
}

// ─── SvelteKit Endpoint Options ───────────────────────────────────────────────

export interface OgEndpointOptions {
	siteName: string
	defaultTemplate?: 'blog' | 'profile' | 'default' | OgTemplate
	colors?: Partial<OgColorConfig>
	fonts?: OgFontConfig
	noise?: OgNoiseConfig
	cacheMaxAge?: number
	width?: number
	height?: number
}

// ─── Internal Types ────────────────────────────────────────────────────────────

export interface InternalGenerateContext {
	width: number
	height: number
	fonts: { heading: ArrayBuffer; body: ArrayBuffer }
	colors: OgColorConfig
	noiseDataUrl?: string
}
