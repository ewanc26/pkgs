import { env } from '$env/dynamic/public';
import type { SiteStandardConfig } from '../types.js';

/**
 * Get configuration from environment variables
 * @returns Configuration object or null if required vars are missing
 */
export function getConfigFromEnv(): SiteStandardConfig | null {
	const did = env.PUBLIC_ATPROTO_DID;

	if (!did) {
		console.error('Missing required environment variable: PUBLIC_ATPROTO_DID');
		return null;
	}

	return {
		did,
		pds: env.PUBLIC_ATPROTO_PDS || undefined,
		cacheTTL: env.PUBLIC_CACHE_TTL ? parseInt(env.PUBLIC_CACHE_TTL) : undefined
	};
}

/**
 * Validate that required environment variables are set
 * @throws Error if required variables are missing
 */
export function validateEnv(): void {
	if (!env.PUBLIC_ATPROTO_DID) {
		throw new Error('Missing required environment variable: PUBLIC_ATPROTO_DID');
	}
}
