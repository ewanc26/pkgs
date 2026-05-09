/**
 * Central theme configuration
 * Add new themes here and they'll automatically appear in the dropdown and type system
 */

export interface ThemeDefinition {
	value: string;
	label: string;
	description: string;
	color: string;
	category: 'neutral' | 'warm' | 'cool' | 'vibrant' | 'seasonal';
}

export const THEMES: readonly ThemeDefinition[] = [
	// ── Neutral ────────────────────────────────────────────────────
	{
		value: 'monochrome',
		label: 'Monochrome',
		description: 'Pure greyscale',
		color: 'oklch(78% 0 0)',
		category: 'neutral'
	},
	// ── Warm ──────────────────────────────────────────────────────
	{
		value: 'ruby',
		label: 'Ruby',
		description: 'Bold red',
		color: 'oklch(81.5% 0.228 10)',
		category: 'warm'
	},
	{
		value: 'sunset',
		label: 'Sunset',
		description: 'Warm orange',
		color: 'oklch(80.5% 0.208 45)',
		category: 'warm'
	},
	{
		value: 'lavender',
		label: 'Lavender',
		description: 'Soft purple',
		color: 'oklch(82% 0.215 295)',
		category: 'vibrant'
	},
	// ── Cool ──────────────────────────────────────────────────────
	{
		value: 'forest',
		label: 'Forest',
		description: 'Natural green',
		color: 'oklch(79.5% 0.195 145)',
		category: 'cool'
	},
	{
		value: 'teal',
		label: 'Teal',
		description: 'Blue-green',
		color: 'oklch(79% 0.205 195)',
		category: 'cool'
	},
	// ── Vibrant ───────────────────────────────────────────────────
	{
		value: 'rose',
		label: 'Rose',
		description: 'Pink-red',
		color: 'oklch(83.5% 0.230 350)',
		category: 'vibrant'
	},
	// ── Seasonal: Wheel of the Year ────────────────────────────────
	// The Wheel flows: dark half → deep winter → frost → new life → fire → peak light → harvest → dark half
	{
		value: 'ocean',
		label: 'Ocean',
		description: 'Samhain · deep, the veil thins',
		color: 'oklch(42% 0.18 240)',
		category: 'seasonal'
	},
	{
		value: 'slate',
		label: 'Slate',
		description: 'Yule · deepest dark, winter solstice',
		color: 'oklch(60% 0.06 230)',
		category: 'seasonal'
	},
	{
		value: 'frost',
		label: 'Frost',
		description: 'Imbolc · pale, candlelit, stirrings',
		color: 'oklch(86% 0.04 250)',
		category: 'seasonal'
	},
	{
		value: 'sage',
		label: 'Sage',
		description: 'Ostara · green, new life, growth',
		color: 'oklch(77.77% 0.182 127.42)',
		category: 'seasonal'
	},
	{
		value: 'ember',
		label: 'Ember',
		description: 'Beltane · fire, summer begins',
		color: 'oklch(70% 0.20 35)',
		category: 'seasonal'
	},
	{
		value: 'amber',
		label: 'Amber',
		description: 'Litha · peak light, abundance',
		color: 'oklch(82.8% 0.195 85)',
		category: 'seasonal'
	},
	{
		value: 'copper',
		label: 'Copper',
		description: 'Lughnasadh · first harvest, grain',
		color: 'oklch(68% 0.17 50)',
		category: 'seasonal'
	},
	{
		value: 'rust',
		label: 'Rust',
		description: 'Mabon · autumn equinox, reflection',
		color: 'oklch(55% 0.20 40)',
		category: 'seasonal'
	}
] as const;

export type ColorTheme = (typeof THEMES)[number]['value'];
export const DEFAULT_THEME: ColorTheme = 'slate';

export const CATEGORY_LABELS = {
	neutral: 'Neutral',
	warm: 'Warm',
	cool: 'Cool',
	vibrant: 'Vibrant',
	seasonal: 'Wheel of the Year'
} as const;

export const getThemesByCategory = () => {
	const grouped: Record<ThemeDefinition['category'], ThemeDefinition[]> = {
		neutral: [],
		warm: [],
		cool: [],
		vibrant: [],
		seasonal: []
	};
	THEMES.forEach((theme) => {
		grouped[theme.category].push(theme);
	});
	return grouped;
};

export const getTheme = (value: string): ThemeDefinition | undefined => {
	return THEMES.find((theme) => theme.value === value);
};