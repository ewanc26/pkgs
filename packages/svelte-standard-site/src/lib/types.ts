/**
 * Core types for site.standard.* lexicons
 */

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

/**
 * RGB Color
 */
export interface RGBColor {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
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
 * Publication preferences
 */
export interface PublicationPreferences {
	showInDiscover?: boolean;
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
	preferences?: PublicationPreferences;
}

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
	content?: any; // Open union
	textContent?: string;
	bskyPostRef?: StrongRef;
	tags?: string[];
	publishedAt: string;
	updatedAt?: string;
}

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
