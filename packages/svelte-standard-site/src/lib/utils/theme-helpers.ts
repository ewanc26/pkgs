import type { BasicTheme, ExtendedTheme, BackgroundImage } from '../types.js';
import { rgbToCSS, colorToCSS, isRGBA } from './theme.js';

/**
 * Generate color-mix CSS for theme colors with transparency
 */
export function mixThemeColor(
	variable: string,
	opacity: number,
	fallback = 'transparent'
): string {
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
 * Get theme-aware page background
 */
export function getThemedPageBackground(
	hasTheme: boolean,
	showPageBackground?: boolean
): {
	backgroundColor?: string;
} {
	if (!hasTheme) return {};
	if (showPageBackground === false) return {};
	return { backgroundColor: 'var(--theme-page-background)' };
}

/**
 * Get background image styles
 */
export function getBackgroundImageStyles(bgImage: BackgroundImage | undefined): {
	backgroundImage?: string;
	backgroundSize?: string;
	backgroundPosition?: string;
} {
	if (!bgImage?.url) return {};

	return {
		backgroundImage: `url(${bgImage.url})`,
		backgroundSize: 'cover',
		backgroundPosition: 'center'
	};
}

/**
 * Get font styles from theme
 */
export function getFontStyles(theme: ExtendedTheme | undefined): {
	fontFamily?: string;
} {
	if (!theme) return {};

	const headingFont = theme.headingFont;
	const bodyFont = theme.bodyFont;

	if (bodyFont) {
		return { fontFamily: `"${bodyFont}", system-ui, sans-serif` };
	}

	return {};
}

/**
 * Get heading font styles from theme
 */
export function getHeadingFontStyles(theme: ExtendedTheme | undefined): {
	fontFamily?: string;
} {
	if (!theme?.headingFont) return {};
	return { fontFamily: `"${theme.headingFont}", system-ui, sans-serif` };
}

/**
 * Get page width styles from theme
 */
export function getPageWidthStyles(theme: ExtendedTheme | undefined): {
	maxWidth?: string;
} {
	if (!theme?.pageWidth) return {};
	return { maxWidth: `${theme.pageWidth}px` };
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

/**
 * Convert ExtendedTheme to CSS custom properties
 */
export function extendedThemeToCssVars(theme?: ExtendedTheme): Record<string, string> {
	if (!theme) return {};

	const vars: Record<string, string> = {};

	if (theme.backgroundColor) {
		vars['--theme-background'] = colorToCSS(theme.backgroundColor);
	}

	// Extended theme uses different property names
	if (theme.pageBackground) {
		vars['--theme-page-background'] = colorToCSS(theme.pageBackground);
	}

	if (theme.primary) {
		vars['--theme-accent'] = colorToCSS(theme.primary);
	}

	if (theme.accentBackground) {
		vars['--theme-accent-background'] = colorToCSS(theme.accentBackground);
	}

	if (theme.accentText) {
		vars['--theme-accent-foreground'] = colorToCSS(theme.accentText);
	}

	if (theme.headingFont) {
		vars['--theme-heading-font'] = `"${theme.headingFont}", system-ui, sans-serif`;
	}

	if (theme.bodyFont) {
		vars['--theme-body-font'] = `"${theme.bodyFont}", system-ui, sans-serif`;
	}

	if (theme.pageWidth) {
		vars['--theme-page-width'] = `${theme.pageWidth}px`;
	}

	return vars;
}

/**
 * Convert any theme to CSS custom properties
 */
export function anyThemeToCssVars(
	theme?: BasicTheme | ExtendedTheme
): Record<string, string> {
	if (!theme) return {};

	// Check for basic theme properties
	if ('background' in theme && 'foreground' in theme) {
		return themeToCssVars(theme as BasicTheme);
	}

	return extendedThemeToCssVars(theme as ExtendedTheme);
}
