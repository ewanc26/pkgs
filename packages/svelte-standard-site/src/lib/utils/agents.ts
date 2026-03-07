import { AtpAgent } from '@atproto/api';
import type { ResolvedIdentity } from '../types.js';
import { cache } from './cache.js';

/**
 * Creates an AtpAgent with optional fetch function injection
 */
export function createAgent(service: string, fetchFn?: typeof fetch): AtpAgent {
	const wrappedFetch = fetchFn
		? async (url: URL | RequestInfo, init?: RequestInit) => {
				const urlStr = url instanceof URL ? url.toString() : url;
				const response = await fetchFn(urlStr, init);

				const headers = new Headers(response.headers);
				if (!headers.has('content-type')) {
					headers.set('content-type', 'application/json');
				}

				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers
				});
			}
		: undefined;

	return new AtpAgent({
		service,
		...(wrappedFetch && { fetch: wrappedFetch })
	});
}

/**
 * Resolves a DID to find its PDS endpoint using Slingshot
 * @param did - DID to resolve
 * @param fetchFn - Optional fetch function for SSR
 * @returns Resolved identity with PDS endpoint
 */
export async function resolveIdentity(
	did: string,
	fetchFn?: typeof fetch
): Promise<ResolvedIdentity> {
	const cacheKey = `identity:${did}`;
	const cached = cache.get<ResolvedIdentity>(cacheKey);
	if (cached) return cached;

	const _fetch = fetchFn ?? globalThis.fetch;

	const response = await _fetch(
		`https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`
	);

	if (!response.ok) {
		throw new Error(`Failed to resolve DID: ${response.status} ${response.statusText}`);
	}

	const rawText = await response.text();
	const data = JSON.parse(rawText);

	if (!data.did || !data.pds) {
		throw new Error('Invalid response from identity resolver');
	}

	cache.set(cacheKey, data);
	return data;
}

/**
 * Gets or creates a PDS-specific agent
 * @param did - DID to resolve PDS for
 * @param fetchFn - Optional fetch function for SSR
 * @returns AtpAgent configured for the user's PDS
 */
export async function getPDSAgent(did: string, fetchFn?: typeof fetch): Promise<AtpAgent> {
	const resolved = await resolveIdentity(did, fetchFn);
	return createAgent(resolved.pds, fetchFn);
}

/**
 * Executes a function with automatic fallback
 * @param did - The DID to resolve
 * @param operation - The operation to execute
 * @param fetchFn - Optional fetch function for SSR
 */
export async function withFallback<T>(
	did: string,
	operation: (agent: AtpAgent) => Promise<T>,
	fetchFn?: typeof fetch
): Promise<T> {
	const agents = [
		() => getPDSAgent(did, fetchFn),
		() =>
			Promise.resolve(
				fetchFn
					? createAgent('https://public.api.bsky.app', fetchFn)
					: createAgent('https://public.api.bsky.app')
			)
	];

	let lastError: any;

	for (const getAgent of agents) {
		try {
			const agent = await getAgent();
			return await operation(agent);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

/**
 * Build a PDS blob URL
 * @param pds - PDS endpoint
 * @param did - Repository DID
 * @param cid - Blob CID
 * @returns Full blob URL
 */
export function buildPdsBlobUrl(pds: string, did: string, cid: string): string {
	const pdsBase = pds.replace(/\/$/, '');
	return `${pdsBase}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}
