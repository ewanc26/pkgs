import type { RGBColor } from '../types.js';

/**
 * Convert RGB color object to CSS rgb() string
 */
export function rgbToCSS(color: RGBColor): string {
	return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Convert RGB color object to hex string
 */
export function rgbToHex(color: RGBColor): string {
	const toHex = (n: number) => n.toString(16).padStart(2, '0');
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * Get theme CSS variables from BasicTheme
 */
export function getThemeVars(theme: {
	background: RGBColor;
	foreground: RGBColor;
	accent: RGBColor;
	accentForeground: RGBColor;
}): Record<string, string> {
	return {
		'--theme-background': rgbToCSS(theme.background),
		'--theme-foreground': rgbToCSS(theme.foreground),
		'--theme-accent': rgbToCSS(theme.accent),
		'--theme-accent-foreground': rgbToCSS(theme.accentForeground)
	};
}
