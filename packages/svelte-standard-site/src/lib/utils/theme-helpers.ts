import type { BasicTheme } from '../types.js';
import { rgbToCSS } from './theme.js';

/**
 * Generate color-mix CSS for theme colors with transparency
 */
export function mixThemeColor(variable: string, opacity: number, fallback = 'transparent'): string {
	return `color-mix(in srgb, var(${variable}) ${opacity}%, ${fallback})`;
}

/**
 * Get theme-aware color styles for text
 */
export function getThemedTextColor(
	hasTheme: boolean,
	opacity = 100
): {
	color?: string;
} {
	if (!hasTheme) return {};
	return opacity === 100
		? { color: 'var(--theme-foreground)' }
		: { color: mixThemeColor('--theme-foreground', opacity) };
}

/**
 * Get theme-aware background color
 */
export function getThemedBackground(
	hasTheme: boolean,
	opacity?: number
): {
	backgroundColor?: string;
} {
	if (!hasTheme) return {};
	if (opacity === undefined) {
		return { backgroundColor: 'var(--theme-background)' };
	}
	return { backgroundColor: mixThemeColor('--theme-background', opacity) };
}

/**
 * Get theme-aware border color
 */
export function getThemedBorder(
	hasTheme: boolean,
	opacity = 20
): {
	borderColor?: string;
} {
	if (!hasTheme) return {};
	return { borderColor: mixThemeColor('--theme-foreground', opacity) };
}

/**
 * Get theme-aware accent color
 */
export function getThemedAccent(
	hasTheme: boolean,
	opacity?: number
): {
	color?: string;
	backgroundColor?: string;
} {
	if (!hasTheme) return {};
	if (opacity === undefined) {
		return { color: 'var(--theme-accent)' };
	}
	return {
		backgroundColor: mixThemeColor('--theme-accent', opacity),
		color: 'var(--theme-accent)'
	};
}

/**
 * Convert BasicTheme to CSS custom properties
 */
export function themeToCssVars(theme?: BasicTheme): Record<string, string> {
	if (!theme) return {};

	return {
		'--theme-background': rgbToCSS(theme.background),
		'--theme-foreground': rgbToCSS(theme.foreground),
		'--theme-accent': rgbToCSS(theme.accent),
		'--theme-accent-foreground': rgbToCSS(theme.accentForeground)
	};
}
