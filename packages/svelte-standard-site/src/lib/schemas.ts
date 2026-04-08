/**
 * Zod schemas for standard.site lexicons and configuration
 */

import { z } from 'zod';

/**
 * AT Protocol collections
 */
export const COLLECTIONS = {
	DOCUMENT: 'site.standard.document',
	PUBLICATION: 'site.standard.publication'
} as const;

/**
 * RGB Color schema
 */
export const RGBColorSchema = z.object({
	r: z.number().int().min(0).max(255),
	g: z.number().int().min(0).max(255),
	b: z.number().int().min(0).max(255)
});

/**
 * RGBA Color schema (with alpha)
 */
export const RGBAColorSchema = z.object({
	r: z.number().int().min(0).max(255),
	g: z.number().int().min(0).max(255),
	b: z.number().int().min(0).max(255),
	a: z.number().int().min(0).max(100)
});

/**
 * Color union (RGB or RGBA)
 */
export const ColorSchema = z.union([RGBColorSchema, RGBAColorSchema]);

/**
 * Background Image schema
 */
export const BackgroundImageSchema = z.object({
	$type: z.literal('pub.leaflet.theme.backgroundImage').optional(),
	url: z.string(),
	opacity: z.number().min(0).max(1).optional(),
	blur: z.number().min(0).optional()
});

/**
 * Basic Theme schema
 */
export const BasicThemeSchema = z.object({
	$type: z.literal('site.standard.theme.basic').optional(),
	background: RGBColorSchema,
	foreground: RGBColorSchema,
	accent: RGBColorSchema,
	accentForeground: RGBColorSchema
});

/**
 * Extended Theme schema (pub.leaflet.publication#theme)
 */
export const ExtendedThemeSchema = z.object({
	$type: z.literal('pub.leaflet.theme').optional(),
	backgroundColor: ColorSchema.optional(),
	pageBackground: ColorSchema.optional(),
	showPageBackground: z.boolean().optional(),
	primary: ColorSchema.optional(),
	accentBackground: ColorSchema.optional(),
	accentText: ColorSchema.optional(),
	headingFont: z.string().max(100).optional(),
	bodyFont: z.string().max(100).optional(),
	pageWidth: z.number().int().min(0).max(1600).optional(),
	backgroundImage: BackgroundImageSchema.optional()
});

/**
 * Publication Preferences schema
 */
export const PublicationPreferencesSchema = z.object({
	showInDiscover: z.boolean().optional(),
	showComments: z.boolean().optional(),
	showMentions: z.boolean().optional(),
	showPrevNext: z.boolean().optional(),
	showRecommends: z.boolean().optional()
});

/**
 * AT Protocol Blob schema
 */
export const AtProtoBlobSchema = z.object({
	$type: z.literal('blob'),
	ref: z.object({
		$link: z.string()
	}),
	mimeType: z.string(),
	size: z.number().int().positive()
});

/**
 * Strong Reference schema
 */
export const StrongRefSchema = z.object({
	uri: z.string(),
	cid: z.string()
});

/**
 * Publication schema
 */
export const PublicationSchema = z.object({
	$type: z.literal('site.standard.publication'),
	name: z.string(),
	url: z.string().url(),
	description: z.string().optional(),
	icon: AtProtoBlobSchema.optional(),
	basicTheme: BasicThemeSchema.optional(),
	preferences: PublicationPreferencesSchema.optional()
});

/**
 * Document schema
 */
export const DocumentSchema = z.object({
	$type: z.literal('site.standard.document'),
	site: z.string(),
	title: z.string(),
	publishedAt: z.string().datetime(),
	path: z.string().optional(),
	description: z.string().optional(),
	updatedAt: z.string().datetime().optional(),
	tags: z.array(z.string()).optional(),
	coverImage: AtProtoBlobSchema.optional(),
	textContent: z.string().optional(),
	content: z.unknown().optional(),
	bskyPostRef: StrongRefSchema.optional(),
	preferences: PublicationPreferencesSchema.optional()
});

/**
 * Publisher configuration schema
 */
export const PublisherConfigSchema = z.object({
	identifier: z.string(), // handle or DID
	password: z.string(),
	service: z.string().url().optional()
});

/**
 * Reader/Client configuration schema
 */
export const ReaderConfigSchema = z.object({
	did: z.string(),
	pds: z.string().url().optional(),
	cacheTTL: z.number().int().positive().optional()
});

/**
 * Loader configuration schema
 */
export const LoaderConfigSchema = z.object({
	repo: z.string(),
	excludeSite: z.string().url().optional(),
	publication: z.string().optional(),
	limit: z.number().int().positive().default(100),
	service: z.string().url().default('https://public.api.bsky.app')
});

// ============================================
// Rich Text Facet Schemas (pub.leaflet.richtext.facet)
// ============================================

/**
 * Byte slice for facet index
 */
export const ByteSliceSchema = z.object({
	byteStart: z.number().int().min(0),
	byteEnd: z.number().int().min(0)
});

/**
 * Link facet feature
 */
export const LinkFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#link'),
	uri: z.string()
});

/**
 * DID Mention facet feature
 */
export const DidMentionFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#didMention'),
	did: z.string()
});

/**
 * AT URI Mention facet feature
 */
export const AtMentionFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#atMention'),
	atURI: z.string()
});

/**
 * Code facet feature (inline code)
 */
export const CodeFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#code')
});

/**
 * Highlight facet feature
 */
export const HighlightFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#highlight')
});

/**
 * Underline facet feature
 */
export const UnderlineFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#underline')
});

/**
 * Strikethrough facet feature
 */
export const StrikethroughFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#strikethrough')
});

/**
 * Bold facet feature
 */
export const BoldFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#bold')
});

/**
 * Italic facet feature
 */
export const ItalicFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#italic')
});

/**
 * ID facet feature (for anchor links)
 */
export const IdFeatureSchema = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#id'),
	id: z.string()
});

/**
 * Footnote facet feature
 */
export const FootnoteFeatureSchema: z.ZodType<any> = z.object({
	$type: z.literal('pub.leaflet.richtext.facet#footnote'),
	footnoteId: z.string(),
	contentPlaintext: z.string(),
	contentFacets: z.array(z.lazy(() => FacetSchema)).optional()
});

/**
 * Facet feature union
 */
export const FacetFeatureSchema: z.ZodType<any> = z.union([
	LinkFeatureSchema,
	DidMentionFeatureSchema,
	AtMentionFeatureSchema,
	CodeFeatureSchema,
	HighlightFeatureSchema,
	UnderlineFeatureSchema,
	StrikethroughFeatureSchema,
	BoldFeatureSchema,
	ItalicFeatureSchema,
	IdFeatureSchema,
	FootnoteFeatureSchema
]);

/**
 * Rich Text Facet schema
 */
export const FacetSchema: z.ZodType<any> = z.object({
	index: ByteSliceSchema,
	features: z.array(FacetFeatureSchema)
});

// ============================================
// Block Schemas (pub.leaflet.blocks.*)
// ============================================

/**
 * Text Block schema
 */
export const TextBlockSchema = z.object({
	$type: z.literal('pub.leaflet.blocks.text'),
	plaintext: z.string(),
	textSize: z.enum(['default', 'small', 'large']).optional(),
	facets: z.array(FacetSchema).optional()
});

/**
 * Header Block schema
 */
export const HeaderBlockSchema = z.object({
	$type: z.literal('pub.leaflet.blocks.header'),
	plaintext: z.string(),
	level: z.number().int().min(1).max(6).optional(),
	facets: z.array(FacetSchema).optional()
});

/**
 * Ordered List Item schema
 */
export const OrderedListItemSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		content: z.union([TextBlockSchema, HeaderBlockSchema, z.any()]).optional(),
		checked: z.boolean().optional(),
		children: z.array(OrderedListItemSchema).optional(),
		unorderedListChildren: z.any().optional()
	})
);

/**
 * Ordered List Block schema
 */
export const OrderedListBlockSchema = z.object({
	$type: z.literal('pub.leaflet.blocks.orderedList'),
	children: z.array(OrderedListItemSchema),
	startIndex: z.number().int().optional()
});

/**
 * Unordered List Item schema
 */
export const UnorderedListItemSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		content: z.union([TextBlockSchema, HeaderBlockSchema, z.any()]).optional(),
		children: z.array(UnorderedListItemSchema).optional()
	})
);

/**
 * Unordered List Block schema
 */
export const UnorderedListBlockSchema = z.object({
	$type: z.literal('pub.leaflet.blocks.unorderedList'),
	children: z.array(UnorderedListItemSchema)
});

// ============================================
// Comment Schemas (pub.leaflet.comment)
// ============================================

/**
 * Linear Document Quote schema (for comment attachments)
 */
export const LinearDocumentQuoteSchema = z.object({
	$type: z.literal('pub.leaflet.comment#linearDocumentQuote').optional(),
	document: z.string(),
	quote: z.object({
		start: z.object({
			block: z.array(z.number().int()),
			offset: z.number().int()
		}),
		end: z.object({
			block: z.array(z.number().int()),
			offset: z.number().int()
		})
	}).optional()
});

/**
 * Comment Reply Reference schema
 */
export const CommentReplyRefSchema = z.object({
	$type: z.literal('pub.leaflet.comment#replyRef').optional(),
	parent: z.string()
});

/**
 * Comment schema
 */
export const CommentSchema = z.object({
	$type: z.literal('pub.leaflet.comment'),
	subject: z.string(),
	plaintext: z.string(),
	createdAt: z.string().datetime(),
	reply: CommentReplyRefSchema.optional(),
	facets: z.array(FacetSchema).optional(),
	onPage: z.string().optional(),
	attachment: LinearDocumentQuoteSchema.optional()
});

// ============================================
// Interactions Schemas (pub.leaflet.interactions.*)
// ============================================

/**
 * Recommend schema
 */
export const RecommendSchema = z.object({
	$type: z.literal('pub.leaflet.interactions.recommend'),
	subject: z.string(),
	createdAt: z.string().datetime()
});

// ============================================
// Graph Schemas (site.standard.graph.*, pub.leaflet.graph.*)
// ============================================

/**
 * Subscription schema (site.standard.graph.subscription)
 */
export const SubscriptionSchema = z.object({
	$type: z.literal('site.standard.graph.subscription'),
	publication: z.string()
});

/**
 * Leaflet Subscription schema (pub.leaflet.graph.subscription)
 */
export const LeafletSubscriptionSchema = z.object({
	$type: z.literal('pub.leaflet.graph.subscription'),
	publication: z.string()
});

// ============================================
// Content Schemas (pub.leaflet.content)
// ============================================

/**
 * Position schema for quotes
 */
export const PositionSchema = z.object({
	block: z.array(z.number().int()),
	offset: z.number().int()
});

/**
 * Quote schema
 */
export const QuoteSchema = z.object({
	start: PositionSchema,
	end: PositionSchema
});

/**
 * Linear Document Page schema
 */
export const LinearDocumentPageSchema = z.object({
	$type: z.literal('pub.leaflet.pages.linearDocument'),
	id: z.string().optional(),
	blocks: z.array(z.object({
		$type: z.literal('pub.leaflet.pages.linearDocument#block'),
		block: z.any(),
		alignment: z.enum(['#textAlignLeft', '#textAlignCenter', '#textAlignRight', '#textAlignJustify']).optional()
	}))
});

/**
 * Canvas Page schema
 */
export const CanvasPageSchema = z.object({
	$type: z.literal('pub.leaflet.pages.canvas'),
	id: z.string().optional(),
	blocks: z.array(z.object({
		$type: z.literal('pub.leaflet.pages.canvas#block'),
		block: z.any(),
		x: z.number().int(),
		y: z.number().int(),
		width: z.number().int(),
		height: z.number().int().optional(),
		rotation: z.number().int().optional()
	}))
});

/**
 * Content schema (pub.leaflet.content)
 */
export const ContentSchema = z.object({
	$type: z.literal('pub.leaflet.content'),
	pages: z.array(z.union([LinearDocumentPageSchema, CanvasPageSchema]))
});

// ============================================
// Type exports
// ============================================

export type RGBColor = z.infer<typeof RGBColorSchema>;
export type RGBAColor = z.infer<typeof RGBAColorSchema>;
export type Color = z.infer<typeof ColorSchema>;
export type BackgroundImage = z.infer<typeof BackgroundImageSchema>;
export type BasicTheme = z.infer<typeof BasicThemeSchema>;
export type ExtendedTheme = z.infer<typeof ExtendedThemeSchema>;
export type PublicationPreferences = z.infer<typeof PublicationPreferencesSchema>;
export type AtProtoBlob = z.infer<typeof AtProtoBlobSchema>;
export type StrongRef = z.infer<typeof StrongRefSchema>;
export type Publication = z.infer<typeof PublicationSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type PublisherConfig = z.infer<typeof PublisherConfigSchema>;
export type ReaderConfig = z.infer<typeof ReaderConfigSchema>;
export type LoaderConfig = z.infer<typeof LoaderConfigSchema>;

// Rich text types
export type ByteSlice = z.infer<typeof ByteSliceSchema>;
export type LinkFeature = z.infer<typeof LinkFeatureSchema>;
export type DidMentionFeature = z.infer<typeof DidMentionFeatureSchema>;
export type AtMentionFeature = z.infer<typeof AtMentionFeatureSchema>;
export type CodeFeature = z.infer<typeof CodeFeatureSchema>;
export type HighlightFeature = z.infer<typeof HighlightFeatureSchema>;
export type UnderlineFeature = z.infer<typeof UnderlineFeatureSchema>;
export type StrikethroughFeature = z.infer<typeof StrikethroughFeatureSchema>;
export type BoldFeature = z.infer<typeof BoldFeatureSchema>;
export type ItalicFeature = z.infer<typeof ItalicFeatureSchema>;
export type IdFeature = z.infer<typeof IdFeatureSchema>;
export type FootnoteFeature = z.infer<typeof FootnoteFeatureSchema>;
export type FacetFeature = z.infer<typeof FacetFeatureSchema>;
export type Facet = z.infer<typeof FacetSchema>;

// Block types
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type HeaderBlock = z.infer<typeof HeaderBlockSchema>;
export type OrderedListItem = z.infer<typeof OrderedListItemSchema>;
export type OrderedListBlock = z.infer<typeof OrderedListBlockSchema>;
export type UnorderedListItem = z.infer<typeof UnorderedListItemSchema>;
export type UnorderedListBlock = z.infer<typeof UnorderedListBlockSchema>;

// Comment types
export type LinearDocumentQuote = z.infer<typeof LinearDocumentQuoteSchema>;
export type CommentReplyRef = z.infer<typeof CommentReplyRefSchema>;
export type Comment = z.infer<typeof CommentSchema>;

// Interaction types
export type Recommend = z.infer<typeof RecommendSchema>;

// Graph types
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type LeafletSubscription = z.infer<typeof LeafletSubscriptionSchema>;

// Content types
export type Position = z.infer<typeof PositionSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type LinearDocumentPage = z.infer<typeof LinearDocumentPageSchema>;
export type CanvasPage = z.infer<typeof CanvasPageSchema>;
export type Content = z.infer<typeof ContentSchema>;
