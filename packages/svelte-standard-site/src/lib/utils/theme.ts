import type { RGBColor, RGBAColor, Color, BasicTheme, ExtendedTheme, BackgroundImage } from '../types.js';

/**
 * Type guard for RGBA color
 */
export function isRGBA(color: Color): color is RGBAColor {
	return 'a' in color;
}

/**
 * Convert RGB color object to CSS rgb() string
 */
export function rgbToCSS(color: RGBColor): string {
	return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Convert RGBA color object to CSS rgba() string
 */
export function rgbaToCSS(color: RGBAColor): string {
	// Alpha is 0-100, convert to 0-1
	const alpha = color.a / 100;
	return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

/**
 * Convert Color (RGB or RGBA) to CSS string
 */
export function colorToCSS(color: Color): string {
	if (isRGBA(color)) {
		return rgbaToCSS(color);
	}
	return rgbToCSS(color);
}

/**
 * Convert RGB color object to hex string
 */
export function rgbToHex(color: RGBColor): string {
	const toHex = (n: number) => n.toString(16).padStart(2, '0');
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * Convert RGBA color object to hex string with alpha
 */
export function rgbaToHex(color: RGBAColor): string {
	const toHex = (n: number) => n.toString(16).padStart(2, '0');
	const alpha = Math.round((color.a / 100) * 255);
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${toHex(alpha)}`;
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

/**
 * Get CSS for background image
 */
export function getBackgroundImageCSS(bgImage: BackgroundImage | undefined): Record<string, string> {
	if (!bgImage?.url) return {};

	const styles: Record<string, string> = {
		'background-image': `url(${bgImage.url})`,
		'background-size': 'cover',
		'background-position': 'center',
		'background-repeat': 'no-repeat'
	};

	if (bgImage.opacity !== undefined) {
		// For opacity, we need to use a pseudo-element or overlay
		// This is handled separately in the component
	}

	if (bgImage.blur !== undefined) {
		styles['background-blur'] = `${bgImage.blur}px`;
	}

	return styles;
}

/**
 * Convert BasicTheme to CSS custom properties
 */
export function basicThemeToCssVars(theme: BasicTheme): Record<string, string> {
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
export function extendedThemeToCssVars(theme: ExtendedTheme): Record<string, string> {
	const vars: Record<string, string> = {};

	if (theme.backgroundColor) {
		vars['--theme-background'] = colorToCSS(theme.backgroundColor);
	}

	if (theme.pageBackground) {
		vars['--theme-page-background'] = colorToCSS(theme.pageBackground);
	}

	if (theme.primary) {
		vars['--theme-primary'] = colorToCSS(theme.primary);
	}

	if (theme.accentBackground) {
		vars['--theme-accent-background'] = colorToCSS(theme.accentBackground);
	}

	if (theme.accentText) {
		vars['--theme-accent-text'] = colorToCSS(theme.accentText);
	}

	if (theme.headingFont) {
		vars['--theme-heading-font'] = theme.headingFont;
	}

	if (theme.bodyFont) {
		vars['--theme-body-font'] = theme.bodyFont;
	}

	if (theme.pageWidth) {
		vars['--theme-page-width'] = `${theme.pageWidth}px`;
	}

	// Map extended theme properties to standard theme variables for compatibility
	if (theme.backgroundColor) {
		vars['--theme-background'] = colorToCSS(theme.backgroundColor);
	}

	// Use primary as accent if accent is not defined
	if (theme.primary && !theme.accentBackground) {
		vars['--theme-accent'] = colorToCSS(theme.primary);
	}

	return vars;
}

/**
 * Convert any theme (Basic or Extended) to CSS custom properties
 */
export function themeToCssVars(theme: BasicTheme | ExtendedTheme | undefined): Record<string, string> {
	if (!theme) return {};

	// Check if it's a basic theme
	if ('background' in theme && 'foreground' in theme && 'accent' in theme && 'accentForeground' in theme) {
		return basicThemeToCssVars(theme as BasicTheme);
	}

	// Otherwise treat as extended theme
	return extendedThemeToCssVars(theme as ExtendedTheme);
}

/**
 * Get font family CSS with fallbacks
 */
export function getFontFamilyCSS(fontName: string | undefined, fallback: string): string {
	if (!fontName) return fallback;
	return `"${fontName}", ${fallback}`;
}

/**
 * Generate Google Fonts URL for custom fonts
 */
export function getGoogleFontsUrl(fonts: { headingFont?: string; bodyFont?: string }): string | null {
	const families: string[] = [];

	if (fonts.headingFont) {
		families.push(`${encodeURIComponent(fonts.headingFont)}:wght@400;600;700`);
	}

	if (fonts.bodyFont) {
		families.push(`${encodeURIComponent(fonts.bodyFont)}:wght@400;500;600`);
	}

	if (families.length === 0) return null;

	return `https://fonts.googleapis.com/css2?family=${families.join('&family=')}&display=swap`;
}

/**
 * Get all theme CSS variables including defaults
 */
export function getAllThemeVars(theme?: BasicTheme | ExtendedTheme): Record<string, string> {
	const defaults: Record<string, string> = {
		'--theme-background': 'rgb(255, 255, 255)',
		'--theme-foreground': 'rgb(0, 0, 0)',
		'--theme-accent': 'rgb(0, 0, 225)',
		'--theme-accent-foreground': 'rgb(255, 255, 255)',
		'--theme-page-background': 'rgb(255, 255, 255)',
		'--theme-primary': 'rgb(0, 0, 225)',
		'--theme-accent-background': 'rgb(0, 0, 225)',
		'--theme-accent-text': 'rgb(255, 255, 255)',
		'--theme-heading-font': 'system-ui, -apple-system, sans-serif',
		'--theme-body-font': 'system-ui, -apple-system, sans-serif',
		'--theme-page-width': '800px'
	};

	const themeVars = themeToCssVars(theme);

	return { ...defaults, ...themeVars };
}
