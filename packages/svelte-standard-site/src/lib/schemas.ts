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
 * Publication Preferences schema
 */
export const PublicationPreferencesSchema = z.object({
	showInDiscover: z.boolean().optional()
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
	bskyPostRef: StrongRefSchema.optional()
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

// Type exports
export type RGBColor = z.infer<typeof RGBColorSchema>;
export type BasicTheme = z.infer<typeof BasicThemeSchema>;
export type PublicationPreferences = z.infer<typeof PublicationPreferencesSchema>;
export type AtProtoBlob = z.infer<typeof AtProtoBlobSchema>;
export type StrongRef = z.infer<typeof StrongRefSchema>;
export type Publication = z.infer<typeof PublicationSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type PublisherConfig = z.infer<typeof PublisherConfigSchema>;
export type ReaderConfig = z.infer<typeof ReaderConfigSchema>;
export type LoaderConfig = z.infer<typeof LoaderConfigSchema>;
