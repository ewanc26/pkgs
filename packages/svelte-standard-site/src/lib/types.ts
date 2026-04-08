/**
 * Core types for site.standard.* and pub.leaflet.* lexicons
 */

// ============================================
// AT Protocol Base Types
// ============================================

/**
 * AT Protocol blob reference
 */
export interface AtProtoBlob {
	$type: 'blob';
	ref: {
		$link: string;
	};
	mimeType: string;
	size: number;
}

/**
 * Strong reference to another AT Protocol record
 */
export interface StrongRef {
	uri: string;
	cid: string;
}

// ============================================
// Color & Theme Types
// ============================================

/**
 * RGB Color
 */
export interface RGBColor {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
}

/**
 * RGBA Color (with alpha)
 */
export interface RGBAColor {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
	a: number; // 0-100
}

/**
 * Color union (RGB or RGBA)
 */
export type Color = RGBColor | RGBAColor;

/**
 * Background image configuration
 */
export interface BackgroundImage {
	$type?: 'pub.leaflet.theme.backgroundImage';
	url: string;
	opacity?: number; // 0-1
	blur?: number;
}

/**
 * Basic theme for publications
 */
export interface BasicTheme {
	$type?: 'site.standard.theme.basic';
	background: RGBColor;
	foreground: RGBColor;
	accent: RGBColor;
	accentForeground: RGBColor;
}

/**
 * Extended theme for publications (pub.leaflet.publication#theme)
 */
export interface ExtendedTheme {
	$type?: 'pub.leaflet.theme';
	backgroundColor?: Color;
	pageBackground?: Color;
	showPageBackground?: boolean;
	primary?: Color;
	accentBackground?: Color;
	accentText?: Color;
	headingFont?: string;
	bodyFont?: string;
	pageWidth?: number; // 0-1600
	backgroundImage?: BackgroundImage;
}

// ============================================
// Publication Types
// ============================================

/**
 * Publication preferences
 */
export interface PublicationPreferences {
	showInDiscover?: boolean;
	showComments?: boolean;
	showMentions?: boolean;
	showPrevNext?: boolean;
	showRecommends?: boolean;
}

/**
 * Site Standard Publication record
 */
export interface Publication {
	$type: 'site.standard.publication';
	url: string;
	name: string;
	icon?: string; // Blob URL converted to string
	description?: string;
	basicTheme?: BasicTheme;
	theme?: ExtendedTheme;
	preferences?: PublicationPreferences;
}

// ============================================
// Document Types
// ============================================

/**
 * Site Standard Document record
 */
export interface Document {
	$type: 'site.standard.document';
	site: string; // AT URI or HTTPS URL
	title: string;
	path?: string;
	description?: string;
	coverImage?: string; // Blob URL converted to string
	content?: Content; // Open union
	textContent?: string;
	bskyPostRef?: StrongRef;
	tags?: string[];
	publishedAt: string;
	updatedAt?: string;
	theme?: ExtendedTheme;
	preferences?: PublicationPreferences;
}

// ============================================
// Rich Text Facet Types (pub.leaflet.richtext.facet)
// ============================================

/**
 * Byte slice for facet index
 */
export interface ByteSlice {
	byteStart: number;
	byteEnd: number;
}

/**
 * Link facet feature
 */
export interface LinkFeature {
	$type: 'pub.leaflet.richtext.facet#link';
	uri: string;
}

/**
 * DID Mention facet feature
 */
export interface DidMentionFeature {
	$type: 'pub.leaflet.richtext.facet#didMention';
	did: string;
}

/**
 * AT URI Mention facet feature
 */
export interface AtMentionFeature {
	$type: 'pub.leaflet.richtext.facet#atMention';
	atURI: string;
}

/**
 * Code facet feature (inline code)
 */
export interface CodeFeature {
	$type: 'pub.leaflet.richtext.facet#code';
}

/**
 * Highlight facet feature
 */
export interface HighlightFeature {
	$type: 'pub.leaflet.richtext.facet#highlight';
}

/**
 * Underline facet feature
 */
export interface UnderlineFeature {
	$type: 'pub.leaflet.richtext.facet#underline';
}

/**
 * Strikethrough facet feature
 */
export interface StrikethroughFeature {
	$type: 'pub.leaflet.richtext.facet#strikethrough';
}

/**
 * Bold facet feature
 */
export interface BoldFeature {
	$type: 'pub.leaflet.richtext.facet#bold';
}

/**
 * Italic facet feature
 */
export interface ItalicFeature {
	$type: 'pub.leaflet.richtext.facet#italic';
}

/**
 * ID facet feature (for anchor links)
 */
export interface IdFeature {
	$type: 'pub.leaflet.richtext.facet#id';
	id: string;
}

/**
 * Footnote facet feature
 */
export interface FootnoteFeature {
	$type: 'pub.leaflet.richtext.facet#footnote';
	footnoteId: string;
	contentPlaintext: string;
	contentFacets?: Facet[];
}

/**
 * Facet feature union
 */
export type FacetFeature =
	| LinkFeature
	| DidMentionFeature
	| AtMentionFeature
	| CodeFeature
	| HighlightFeature
	| UnderlineFeature
	| StrikethroughFeature
	| BoldFeature
	| ItalicFeature
	| IdFeature
	| FootnoteFeature;

/**
 * Rich Text Facet
 */
export interface Facet {
	index: ByteSlice;
	features: FacetFeature[];
}

// ============================================
// Block Types (pub.leaflet.blocks.*)
// ============================================

/**
 * Text Block
 */
export interface TextBlock {
	$type: 'pub.leaflet.blocks.text';
	plaintext: string;
	textSize?: 'default' | 'small' | 'large';
	facets?: Facet[];
}

/**
 * Header Block
 */
export interface HeaderBlock {
	$type: 'pub.leaflet.blocks.header';
	plaintext: string;
	level?: number; // 1-6
	facets?: Facet[];
}

/**
 * Blockquote Block
 */
export interface BlockquoteBlock {
	$type: 'pub.leaflet.blocks.blockquote';
	plaintext: string;
	facets?: Facet[];
}

/**
 * Image Block
 */
export interface ImageBlock {
	$type: 'pub.leaflet.blocks.image';
	image: AtProtoBlob;
	alt?: string;
	aspectRatio?: { width: number; height: number };
}

/**
 * Code Block
 */
export interface CodeBlock {
	$type: 'pub.leaflet.blocks.code';
	code: string;
	language?: string;
	filename?: string;
}

/**
 * Math Block
 */
export interface MathBlock {
	$type: 'pub.leaflet.blocks.math';
	tex: string;
	display?: boolean;
}

/**
 * Ordered List Item
 */
export interface OrderedListItem {
	content?: TextBlock | HeaderBlock | ImageBlock;
	checked?: boolean; // For checklist items
	children?: OrderedListItem[];
	unorderedListChildren?: UnorderedListBlock;
}

/**
 * Ordered List Block
 */
export interface OrderedListBlock {
	$type: 'pub.leaflet.blocks.orderedList';
	children: OrderedListItem[];
	startIndex?: number;
}

/**
 * Unordered List Item
 */
export interface UnorderedListItem {
	content?: TextBlock | HeaderBlock | ImageBlock;
	children?: UnorderedListItem[];
}

/**
 * Unordered List Block
 */
export interface UnorderedListBlock {
	$type: 'pub.leaflet.blocks.unorderedList';
	children: UnorderedListItem[];
}

/**
 * Horizontal Rule Block
 */
export interface HorizontalRuleBlock {
	$type: 'pub.leaflet.blocks.horizontalRule';
}

/**
 * Iframe Block
 */
export interface IframeBlock {
	$type: 'pub.leaflet.blocks.iframe';
	src: string;
	title?: string;
	width?: number;
	height?: number;
}

/**
 * Website Embed Block
 */
export interface WebsiteBlock {
	$type: 'pub.leaflet.blocks.website';
	url: string;
	title?: string;
	description?: string;
	image?: AtProtoBlob;
}

/**
 * Button Block
 */
export interface ButtonBlock {
	$type: 'pub.leaflet.blocks.button';
	text: string;
	href: string;
	variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * Bluesky Post Block
 */
export interface BskyPostBlock {
	$type: 'pub.leaflet.blocks.bskyPost';
	uri: string;
}

/**
 * Poll Block
 */
export interface PollBlock {
	$type: 'pub.leaflet.blocks.poll';
	question: string;
	options: Array<{ text: string; votes?: number }>;
	endsAt?: string;
}

/**
 * Page Block (internal page reference)
 */
export interface PageBlock {
	$type: 'pub.leaflet.blocks.page';
	pageId: string;
}

/**
 * Block union type
 */
export type Block =
	| TextBlock
	| HeaderBlock
	| BlockquoteBlock
	| ImageBlock
	| CodeBlock
	| MathBlock
	| OrderedListBlock
	| UnorderedListBlock
	| HorizontalRuleBlock
	| IframeBlock
	| WebsiteBlock
	| ButtonBlock
	| BskyPostBlock
	| PollBlock
	| PageBlock;

// ============================================
// Content Types (pub.leaflet.content)
// ============================================

/**
 * Position for quotes
 */
export interface Position {
	block: number[];
	offset: number;
}

/**
 * Quote reference
 */
export interface Quote {
	start: Position;
	end: Position;
}

/**
 * Linear Document Page Block Wrapper
 */
export interface LinearDocumentBlockWrapper {
	$type: 'pub.leaflet.pages.linearDocument#block';
	block: Block;
	alignment?: '#textAlignLeft' | '#textAlignCenter' | '#textAlignRight' | '#textAlignJustify';
}

/**
 * Linear Document Page
 */
export interface LinearDocumentPage {
	$type: 'pub.leaflet.pages.linearDocument';
	id?: string;
	blocks: LinearDocumentBlockWrapper[];
	quote?: Quote;
}

/**
 * Canvas Page Block Wrapper
 */
export interface CanvasBlockWrapper {
	$type: 'pub.leaflet.pages.canvas#block';
	block: Block;
	x: number;
	y: number;
	width: number;
	height?: number;
	rotation?: number;
}

/**
 * Canvas Page
 */
export interface CanvasPage {
	$type: 'pub.leaflet.pages.canvas';
	id?: string;
	blocks: CanvasBlockWrapper[];
	quote?: Quote;
}

/**
 * Content (pub.leaflet.content)
 */
export interface Content {
	$type: 'pub.leaflet.content';
	pages: (LinearDocumentPage | CanvasPage)[];
}

// ============================================
// Comment Types (pub.leaflet.comment)
// ============================================

/**
 * Linear Document Quote (for comment attachments)
 */
export interface LinearDocumentQuote {
	$type?: 'pub.leaflet.comment#linearDocumentQuote';
	document: string;
	quote?: Quote;
}

/**
 * Comment Reply Reference
 */
export interface CommentReplyRef {
	$type?: 'pub.leaflet.comment#replyRef';
	parent: string;
}

/**
 * Comment record
 */
export interface CommentRecord {
	$type: 'pub.leaflet.comment';
	subject: string; // AT-URI of the document being commented on
	plaintext: string;
	createdAt: string;
	reply?: CommentReplyRef;
	facets?: Facet[];
	onPage?: string;
	attachment?: LinearDocumentQuote;
}

// ============================================
// Interaction Types (pub.leaflet.interactions.*)
// ============================================

/**
 * Recommend record
 */
export interface RecommendRecord {
	$type: 'pub.leaflet.interactions.recommend';
	subject: string; // AT-URI of the document being recommended
	createdAt: string;
}

// ============================================
// Graph Types (site.standard.graph.*, pub.leaflet.graph.*)
// ============================================

/**
 * Subscription record (site.standard.graph.subscription)
 */
export interface SubscriptionRecord {
	$type: 'site.standard.graph.subscription';
	publication: string; // AT-URI of the publication
}

/**
 * Leaflet Subscription record (pub.leaflet.graph.subscription)
 */
export interface LeafletSubscriptionRecord {
	$type: 'pub.leaflet.graph.subscription';
	publication: string; // AT-URI of the publication
}

// ============================================
// Utility Types
// ============================================

/**
 * AT Protocol record response
 */
export interface AtProtoRecord<T = any> {
	uri: string;
	cid: string;
	value: T;
}

/**
 * Resolved identity from PDS resolution
 */
export interface ResolvedIdentity {
	did: string;
	pds: string;
	handle?: string;
}

/**
 * Configuration for the library
 */
export interface SiteStandardConfig {
	/** The DID to fetch records from */
	did: string;
	/** Optional custom PDS endpoint */
	pds?: string;
	/** Cache TTL in milliseconds (default: 5 minutes) */
	cacheTTL?: number;
}
