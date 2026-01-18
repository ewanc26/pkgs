/**
 * Extract rkey from AT URI
 */
export function extractRkey(uri: string): string | null {
	const match = uri.match(/at:\/\/[^\/]+\/[^\/]+\/(.+)$/);
	return match ? match[1] : null;
}

/**
 * Get document slug (uses path if available, otherwise rkey)
 */
export function getDocumentSlug(document: { uri: string; value: { path?: string } }): string {
	if (document.value.path) {
		// Remove leading slash if present
		return document.value.path.replace(/^\//, '');
	}
	return extractRkey(document.uri) || '';
}

/**
 * Get document canonical URL
 */
export function getDocumentUrl(document: {
	value: { site: string; path?: string };
	uri: string;
}): string {
	const { site, path } = document.value;

	// If site is an AT URI, we'll use our local route
	if (site.startsWith('at://')) {
		return `/documents/${getDocumentSlug(document as any)}`;
	}

	// If site is HTTPS and we have a path, combine them
	if (path) {
		return `${site.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
	}

	// Fallback to local route
	return `/documents/${extractRkey(document.uri)}`;
}
