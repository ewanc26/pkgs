/**
 * AT URI parsing and conversion utilities
 */

/**
 * Parsed AT URI components
 */
export interface ParsedAtUri {
	did: string;
	collection: string;
	rkey: string;
}

/**
 * Parse an AT URI into its components
 * @param atUri - AT URI in format: at://did:plc:xxx/collection/rkey
 * @returns Parsed components or null if invalid
 */
export function parseAtUri(atUri: string): ParsedAtUri | null {
	if (!atUri.startsWith('at://')) return null;

	const withoutProtocol = atUri.slice(5); // Remove "at://"
	const parts = withoutProtocol.split('/');

	if (parts.length !== 3) return null;

	const [did, collection, rkey] = parts;

	if (!did.startsWith('did:') || !collection || !rkey) return null;

	return { did, collection, rkey };
}

/**
 * Convert AT URI to HTTPS URL for com.atproto.repo.getRecord
 * @param atUri - AT URI in format: at://did:plc:xxx/collection/rkey
 * @param pdsEndpoint - PDS endpoint (e.g., "https://cortinarius.us-west.host.bsky.network")
 * @returns HTTPS URL for getRecord XRPC call
 */
export function atUriToHttps(atUri: string, pdsEndpoint: string): string | null {
	const parsed = parseAtUri(atUri);
	if (!parsed) return null;

	// Ensure PDS endpoint doesn't have trailing slash
	const pds = pdsEndpoint.replace(/\/$/, '');

	return `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(parsed.did)}&collection=${encodeURIComponent(parsed.collection)}&rkey=${encodeURIComponent(parsed.rkey)}`;
}

/**
 * Construct an AT URI from components
 * @param did - DID of the repository
 * @param collection - Collection name
 * @param rkey - Record key
 * @returns AT URI string
 */
export function buildAtUri(did: string, collection: string, rkey: string): string {
	return `at://${did}/${collection}/${rkey}`;
}

/**
 * Extract rkey from an AT URI
 * @param atUri - AT URI
 * @returns rkey or null if invalid
 */
export function extractRkey(atUri: string): string | null {
	const parsed = parseAtUri(atUri);
	return parsed?.rkey ?? null;
}

/**
 * Validate if string is a valid AT URI
 * @param uri - String to validate
 * @returns true if valid AT URI
 */
export function isAtUri(uri: string): boolean {
	return parseAtUri(uri) !== null;
}

/**
 * Convert DID to PDS hostname format
 * @param did - DID to convert
 * @returns PDS hostname or null if unable to derive
 */
export function didToPdsHostname(did: string): string | null {
	// This is a simplified version - real implementation should use DID resolution
	// For now, we'll return null and rely on explicit PDS configuration
	return null;
}
