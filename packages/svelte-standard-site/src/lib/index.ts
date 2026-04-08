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
	ThemedCard,
	DocumentRenderer,
	MarkdownRenderer,
	LinearDocumentRenderer,
	CanvasRenderer,
	BlockRenderer,
	RichText,
	TextBlock,
	HeaderBlock,
	BlockquoteBlock,
	ImageBlock,
	CodeBlock,
	MathBlock,
	UnorderedListBlock,
	OrderedListBlock,
	HorizontalRuleBlock,
	IframeBlock,
	WebsiteBlock,
	ButtonBlock,
	BskyPostBlock,
	PollBlock,
	PageBlock,
	Avatar,
	Toast,
	Watermark,
	ActionBar,
	RecommendButton,
	ThemeProvider,
	Footnotes,
	Comment,
	CommentsSection
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
	RGBAColor,
	Color,
	BackgroundImage,
	BasicTheme,
	ExtendedTheme,
	PublicationPreferences,
	Publication,
	Document,
	AtProtoRecord,
	ResolvedIdentity,
	SiteStandardConfig,
	// Rich text types
	ByteSlice,
	LinkFeature,
	DidMentionFeature,
	AtMentionFeature,
	CodeFeature,
	HighlightFeature,
	UnderlineFeature,
	StrikethroughFeature,
	BoldFeature,
	ItalicFeature,
	IdFeature,
	FootnoteFeature,
	FacetFeature,
	Facet,
	// Block types
	TextBlock,
	HeaderBlock,
	BlockquoteBlock,
	ImageBlock,
	CodeBlock,
	MathBlock,
	OrderedListItem,
	OrderedListBlock,
	UnorderedListItem,
	UnorderedListBlock,
	HorizontalRuleBlock,
	IframeBlock,
	WebsiteBlock,
	ButtonBlock,
	BskyPostBlock,
	PollBlock,
	PageBlock,
	Block,
	// Content types
	Position,
	Quote,
	LinearDocumentPage,
	CanvasPage,
	Content,
	// Comment types
	LinearDocumentQuote,
	CommentReplyRef,
	CommentRecord,
	// Interaction types
	RecommendRecord,
	// Graph types
	SubscriptionRecord,
	LeafletSubscriptionRecord
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

export {
	rgbToCSS,
	rgbaToCSS,
	colorToCSS,
	rgbToHex,
	rgbaToHex,
	getThemeVars,
	isRGBA,
	basicThemeToCssVars,
	extendedThemeToCssVars,
	themeToCssVars as anyThemeToCssVars,
	getFontFamilyCSS,
	getGoogleFontsUrl,
	getAllThemeVars
} from './utils/theme.js';

export {
	mixThemeColor,
	getThemedTextColor,
	getThemedBackground,
	getThemedBorder,
	getThemedAccent,
	getThemedPageBackground,
	getBackgroundImageStyles,
	getFontStyles,
	getHeadingFontStyles,
	getPageWidthStyles,
	themeToCssVars,
	extendedThemeToCssVars,
	anyThemeToCssVars
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

// Comments exports (Bluesky replies)
export { fetchComments, fetchMentionComments, formatRelativeTime } from './utils/comments.js';

export type { Comment, CommentAuthor, FetchCommentsOptions } from './utils/comments.js';

// Native comments exports
export {
	COMMENTS_COLLECTION,
	createCommentRecord,
	parseCommentUri,
	buildCommentUri,
	fetchComments as fetchNativeComments,
	organizeCommentsIntoThreads,
	countThreadComments,
	extractQuotedText
} from './utils/native-comments.js';

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
