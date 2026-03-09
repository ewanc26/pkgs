/**
 * Normalize a slug to be URI-compatible.
 *
 * Transformations:
 * - Lowercase
 * - Spaces → hyphens
 * - Remove all characters except alphanumeric, hyphens, underscores
 * - Collapse multiple hyphens into one
 * - Strip leading/trailing hyphens
 */
export function normalizeSlug(slug: string): string {
	return slug
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9\-_]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Check if a string matches AT Protocol TID format (12–16 base32 characters).
 */
export function isTidFormat(str: string): boolean {
	return /^[a-zA-Z0-9]{12,16}$/.test(str);
}
