// Main exports
export { SiteStandardClient, createClient } from './client.js';

// Component exports
export {
	DocumentCard,
	PublicationCard,
	ThemeToggle,
	StandardSiteLayout,
	DateDisplay,
	TagList,
	ThemedContainer,
	ThemedText,
	ThemedCard
} from './components/index.js';

// Store exports
export { themeStore } from './stores/index.js';

// Type exports
export type {
	AtProtoBlob,
	StrongRef,
	RGBColor,
	BasicTheme,
	PublicationPreferences,
	Publication,
	Document,
	AtProtoRecord,
	ResolvedIdentity,
	SiteStandardConfig
} from './types.js';

// Utility exports
export { parseAtUri, atUriToHttps, buildAtUri, extractRkey, isAtUri } from './utils/at-uri.js';

export { resolveIdentity, buildPdsBlobUrl } from './utils/agents.js';

export { cache } from './utils/cache.js';

export { rgbToCSS, rgbToHex, getThemeVars } from './utils/theme.js';

export {
	mixThemeColor,
	getThemedTextColor,
	getThemedBackground,
	getThemedBorder,
	getThemedAccent,
	themeToCssVars
} from './utils/theme-helpers.js';

export {
	getDocumentSlug,
	getDocumentUrl,
	extractRkey as extractRkeyFromUri
} from './utils/document.js';
