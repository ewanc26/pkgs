// Main exports
export { SiteStandardClient, createClient } from './client.js';
export { StandardSitePublisher } from './publisher.js';

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

// Comments component
export { default as Comments } from './components/Comments.svelte';

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

// Schema exports
export type {
	PublisherConfig,
	ReaderConfig,
	LoaderConfig
} from './schemas.js';

export { COLLECTIONS } from './schemas.js';

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

// Content transformation exports
export {
	transformContent,
	convertSidenotes,
	convertComplexSidenotes,
	resolveRelativeLinks,
	stripToPlainText,
	countWords,
	calculateReadingTime
} from './utils/content.js';

export type { TransformOptions, TransformResult } from './utils/content.js';

// Comments exports
export { fetchComments, fetchMentionComments, formatRelativeTime } from './utils/comments.js';

export type { Comment, CommentAuthor, FetchCommentsOptions } from './utils/comments.js';

// Verification exports
export {
	generatePublicationWellKnown,
	generateDocumentLinkTag,
	generatePublicationLinkTag,
	getDocumentAtUri,
	getPublicationAtUri,
	verifyPublicationWellKnown,
	extractDocumentLinkFromHtml,
	extractPublicationLinkFromHtml
} from './utils/verification.js';

// Publisher types
export type { PublishDocumentInput, PublishPublicationInput, PublishResult } from './publisher.js';
