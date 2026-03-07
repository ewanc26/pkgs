/**
 * Verification utilities for proving content ownership
 *
 * Creates `.well-known` endpoints and `<link>` tags to verify that
 * you own the content published to ATProto.
 *
 * @example
 * ```ts
 * // SvelteKit endpoint: src/routes/.well-known/site.standard.publication/+server.ts
 * import { generatePublicationWellKnown } from 'svelte-standard-site/verification';
 * import { text } from '@sveltejs/kit';
 *
 * export function GET() {
 *   return text(
 *     generatePublicationWellKnown({
 *       did: 'did:plc:xxx',
 *       publicationRkey: '3abc123xyz',
 *     })
 *   );
 * }
 * ```
 */

/**
 * Parse an AT-URI to extract its components
 */
export function parseAtUri(uri: string): { did: string; collection: string; rkey: string } | null {
	const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
	if (!match) return null;
	return {
		did: match[1],
		collection: match[2],
		rkey: match[3]
	};
}

/**
 * Build an AT-URI for a document
 */
export function getDocumentAtUri(did: string, rkey: string): string {
	return `at://${did}/site.standard.document/${rkey}`;
}

/**
 * Build an AT-URI for a publication
 */
export function getPublicationAtUri(did: string, rkey: string): string {
	return `at://${did}/site.standard.publication/${rkey}`;
}

/**
 * Generate content for /.well-known/site.standard.publication endpoint
 *
 * This endpoint proves you own your publication record on ATProto.
 *
 * @example
 * ```ts
 * // src/routes/.well-known/site.standard.publication/+server.ts
 * import { generatePublicationWellKnown } from 'svelte-standard-site/verification';
 * import { text } from '@sveltejs/kit';
 *
 * export function GET() {
 *   return text(
 *     generatePublicationWellKnown({
 *       did: 'did:plc:xxx',
 *       publicationRkey: '3abc123xyz',
 *     })
 *   );
 * }
 * ```
 */
export function generatePublicationWellKnown(options: {
	did: string;
	publicationRkey: string;
}): string {
	return getPublicationAtUri(options.did, options.publicationRkey);
}

/**
 * Generate a <link> tag for document verification
 *
 * Add this to your document's <head> to verify ownership.
 *
 * @example
 * ```svelte
 * <svelte:head>
 *   {@html generateDocumentLinkTag({
 *     did: 'did:plc:xxx',
 *     documentRkey: '3xyz789abc',
 *   })}
 * </svelte:head>
 * ```
 */
export function generateDocumentLinkTag(options: { did: string; documentRkey: string }): string {
	const atUri = getDocumentAtUri(options.did, options.documentRkey);
	return `<link rel="site.standard.document" href="${atUri}">`;
}

/**
 * Generate a <link> tag for publication verification
 *
 * Add this to your site's <head> to verify publication ownership.
 *
 * @example
 * ```svelte
 * <svelte:head>
 *   {@html generatePublicationLinkTag({
 *     did: 'did:plc:xxx',
 *     publicationRkey: '3abc123xyz',
 *   })}
 * </svelte:head>
 * ```
 */
export function generatePublicationLinkTag(options: {
	did: string;
	publicationRkey: string;
}): string {
	const atUri = getPublicationAtUri(options.did, options.publicationRkey);
	return `<link rel="site.standard.publication" href="${atUri}">`;
}

/**
 * Verify that a well-known endpoint returns the expected AT-URI
 *
 * @example
 * ```ts
 * const isValid = await verifyPublicationWellKnown(
 *   'https://yourblog.com',
 *   'did:plc:xxx',
 *   '3abc123xyz'
 * );
 * ```
 */
export async function verifyPublicationWellKnown(
	siteUrl: string,
	did: string,
	publicationRkey: string
): Promise<boolean> {
	try {
		const cleanUrl = siteUrl.replace(/\/$/, '');
		const response = await fetch(`${cleanUrl}/.well-known/site.standard.publication`);

		if (!response.ok) return false;

		const content = await response.text();
		const expectedUri = getPublicationAtUri(did, publicationRkey);

		return content.trim() === expectedUri;
	} catch (error) {
		console.error('Failed to verify publication well-known:', error);
		return false;
	}
}

/**
 * Extract AT-URI from a <link> tag in HTML
 *
 * @example
 * ```ts
 * const html = '<link rel="site.standard.document" href="at://did:plc:xxx/site.standard.document/3xyz">';
 * const uri = extractDocumentLinkFromHtml(html);
 * // => 'at://did:plc:xxx/site.standard.document/3xyz'
 * ```
 */
export function extractDocumentLinkFromHtml(html: string): string | null {
	const match = html.match(
		/<link\s+rel="site\.standard\.document"\s+href="(at:\/\/[^"]+)"\s*\/?>/i
	);
	return match ? match[1] : null;
}

/**
 * Extract publication AT-URI from a <link> tag in HTML
 */
export function extractPublicationLinkFromHtml(html: string): string | null {
	const match = html.match(
		/<link\s+rel="site\.standard\.publication"\s+href="(at:\/\/[^"]+)"\s*\/?>/i
	);
	return match ? match[1] : null;
}
