import type {
	SiteStandardConfig,
	Publication,
	Document,
	AtProtoRecord,
	ResolvedIdentity
} from './types.js';
import { cache } from './utils/cache.js';
import { resolveIdentity, withFallback, buildPdsBlobUrl } from './utils/agents.js';
import { parseAtUri, atUriToHttps } from './utils/at-uri.js';

/**
 * Main client for interacting with site.standard.* records
 */
export class SiteStandardClient {
	private config: Required<SiteStandardConfig>;
	private pdsEndpoint: string | null = null;

	constructor(config: SiteStandardConfig) {
		this.config = {
			did: config.did,
			pds: config.pds ?? '',
			cacheTTL: config.cacheTTL ?? 5 * 60 * 1000
		};

		// Set cache TTL
		cache.setDefaultTTL(this.config.cacheTTL);
	}

	/**
	 * Resolve and cache PDS endpoint
	 */
	private async resolvePDS(fetchFn?: typeof fetch): Promise<string> {
		if (this.pdsEndpoint) return this.pdsEndpoint;

		if (this.config.pds) {
			this.pdsEndpoint = this.config.pds;
			return this.pdsEndpoint;
		}

		const identity = await resolveIdentity(this.config.did, fetchFn);
		this.pdsEndpoint = identity.pds;
		return this.pdsEndpoint;
	}

	/**
	 * Convert a blob object to a URL string
	 */
	private async getBlobUrl(blob: any, fetchFn?: typeof fetch): Promise<string | undefined> {
		try {
			const cid = blob?.ref?.$link || blob?.cid;
			if (!cid) return undefined;

			const pds = await this.resolvePDS(fetchFn);
			return buildPdsBlobUrl(pds, this.config.did, cid);
		} catch (error) {
			console.warn('Failed to resolve blob URL:', error);
			return undefined;
		}
	}

	/**
	 * Fetch a single publication by rkey
	 * @param rkey - Record key for the publication
	 * @param fetchFn - Optional fetch function for SSR
	 * @returns Publication record or null if not found
	 */
	async fetchPublication(
		rkey: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Publication> | null> {
		const cacheKey = `publication:${this.config.did}:${rkey}`;
		const cached = cache.get<AtProtoRecord<Publication>>(cacheKey);
		if (cached) return cached;

		try {
			const result = await withFallback(
				this.config.did,
				async (agent) => {
					const response = await agent.com.atproto.repo.getRecord({
						repo: this.config.did,
						collection: 'site.standard.publication',
						rkey
					});
					return response.data;
				},
				fetchFn
			);

			if (!result || !result.value) return null;

			const pubValue = result.value as any;

			// Build the publication object with converted blob URLs
			const record: AtProtoRecord<Publication> = {
				uri: result.uri,
				cid: result.cid || '',
				value: {
					$type: 'site.standard.publication',
					url: pubValue.url,
					name: pubValue.name,
					icon: pubValue.icon ? await this.getBlobUrl(pubValue.icon, fetchFn) : undefined,
					description: pubValue.description,
					basicTheme: pubValue.basicTheme,
					preferences: pubValue.preferences
				}
			};

			cache.set(cacheKey, record);
			return record;
		} catch (error) {
			console.error(`Failed to fetch publication ${rkey}:`, error);
			return null;
		}
	}

	/**
	 * Fetch all publications for the configured DID
	 * @param fetchFn - Optional fetch function for SSR
	 * @returns Array of publication records
	 */
	async fetchAllPublications(fetchFn?: typeof fetch): Promise<AtProtoRecord<Publication>[]> {
		const cacheKey = `publications:${this.config.did}:all`;
		const cached = cache.get<AtProtoRecord<Publication>[]>(cacheKey);
		if (cached) return cached;

		try {
			const allRecords: AtProtoRecord<Publication>[] = [];
			let cursor: string | undefined;

			do {
				const records = await withFallback(
					this.config.did,
					async (agent) => {
						const response = await agent.com.atproto.repo.listRecords({
							repo: this.config.did,
							collection: 'site.standard.publication',
							limit: 100,
							cursor
						});
						cursor = response.data.cursor;
						return response.data.records;
					},
					fetchFn
				);

				// Convert each record with blob URLs
				for (const record of records) {
					const pubValue = record.value as any;
					const pub: AtProtoRecord<Publication> = {
						uri: record.uri,
						cid: record.cid || '',
						value: {
							$type: 'site.standard.publication',
							url: pubValue.url,
							name: pubValue.name,
							icon: pubValue.icon ? await this.getBlobUrl(pubValue.icon, fetchFn) : undefined,
							description: pubValue.description,
							basicTheme: pubValue.basicTheme,
							preferences: pubValue.preferences
						}
					};
					allRecords.push(pub);
				}
			} while (cursor);

			cache.set(cacheKey, allRecords);
			return allRecords;
		} catch (error) {
			console.error('Failed to fetch publications:', error);
			return [];
		}
	}

	/**
	 * Fetch a single document by rkey
	 * @param rkey - Record key for the document
	 * @param fetchFn - Optional fetch function for SSR
	 * @returns Document record or null if not found
	 */
	async fetchDocument(
		rkey: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Document> | null> {
		const cacheKey = `document:${this.config.did}:${rkey}`;
		const cached = cache.get<AtProtoRecord<Document>>(cacheKey);
		if (cached) return cached;

		try {
			const result = await withFallback(
				this.config.did,
				async (agent) => {
					const response = await agent.com.atproto.repo.getRecord({
						repo: this.config.did,
						collection: 'site.standard.document',
						rkey
					});
					return response.data;
				},
				fetchFn
			);

			if (!result || !result.value) return null;

			const docValue = result.value as any;

			// Build the document object with converted blob URLs
			const record: AtProtoRecord<Document> = {
				uri: result.uri,
				cid: result.cid || '',
				value: {
					$type: 'site.standard.document',
					site: docValue.site,
					title: docValue.title,
					path: docValue.path,
					description: docValue.description,
					coverImage: docValue.coverImage
						? await this.getBlobUrl(docValue.coverImage, fetchFn)
						: undefined,
					content: docValue.content,
					textContent: docValue.textContent,
					bskyPostRef: docValue.bskyPostRef,
					tags: docValue.tags,
					publishedAt: docValue.publishedAt,
					updatedAt: docValue.updatedAt
				}
			};

			cache.set(cacheKey, record);
			return record;
		} catch (error) {
			console.error(`Failed to fetch document ${rkey}:`, error);
			return null;
		}
	}

	/**
	 * Fetch all documents for the configured DID
	 * @param fetchFn - Optional fetch function for SSR
	 * @returns Array of document records
	 */
	async fetchAllDocuments(fetchFn?: typeof fetch): Promise<AtProtoRecord<Document>[]> {
		const cacheKey = `documents:${this.config.did}:all`;
		const cached = cache.get<AtProtoRecord<Document>[]>(cacheKey);
		if (cached) return cached;

		try {
			const allRecords: AtProtoRecord<Document>[] = [];
			let cursor: string | undefined;

			do {
				const records = await withFallback(
					this.config.did,
					async (agent) => {
						const response = await agent.com.atproto.repo.listRecords({
							repo: this.config.did,
							collection: 'site.standard.document',
							limit: 100,
							cursor
						});
						cursor = response.data.cursor;
						return response.data.records;
					},
					fetchFn
				);

				// Convert each record with blob URLs
				for (const record of records) {
					const docValue = record.value as any;
					const doc: AtProtoRecord<Document> = {
						uri: record.uri,
						cid: record.cid || '',
						value: {
							$type: 'site.standard.document',
							site: docValue.site,
							title: docValue.title,
							path: docValue.path,
							description: docValue.description,
							coverImage: docValue.coverImage
								? await this.getBlobUrl(docValue.coverImage, fetchFn)
								: undefined,
							content: docValue.content,
							textContent: docValue.textContent,
							bskyPostRef: docValue.bskyPostRef,
							tags: docValue.tags,
							publishedAt: docValue.publishedAt,
							updatedAt: docValue.updatedAt
						}
					};
					allRecords.push(doc);
				}
			} while (cursor);

			// Sort by publishedAt, newest first
			allRecords.sort(
				(a, b) => new Date(b.value.publishedAt).getTime() - new Date(a.value.publishedAt).getTime()
			);

			cache.set(cacheKey, allRecords);
			return allRecords;
		} catch (error) {
			console.error('Failed to fetch documents:', error);
			return [];
		}
	}

	/**
	 * Fetch documents for a specific publication
	 * @param publicationUri - AT URI of the publication
	 * @param fetchFn - Optional fetch function for SSR
	 * @returns Array of document records belonging to the publication
	 */
	async fetchDocumentsByPublication(
		publicationUri: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Document>[]> {
		const allDocs = await this.fetchAllDocuments(fetchFn);
		return allDocs.filter((doc) => doc.value.site === publicationUri);
	}

	/**
	 * Fetch a record by AT URI
	 * @param atUri - Full AT URI (e.g., at://did:plc:xxx/site.standard.publication/rkey)
	 * @param fetchFn - Optional fetch function for SSR
	 * @returns Record or null if not found
	 */
	async fetchByAtUri<T = Publication | Document>(
		atUri: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<T> | null> {
		const parsed = parseAtUri(atUri);
		if (!parsed) {
			console.error('Invalid AT URI:', atUri);
			return null;
		}

		if (parsed.collection === 'site.standard.publication') {
			return this.fetchPublication(parsed.rkey, fetchFn) as Promise<AtProtoRecord<T> | null>;
		} else if (parsed.collection === 'site.standard.document') {
			return this.fetchDocument(parsed.rkey, fetchFn) as Promise<AtProtoRecord<T> | null>;
		}

		return null;
	}

	/**
	 * Clear all cached data
	 */
	clearCache(): void {
		cache.clear();
	}

	/**
	 * Get the resolved PDS endpoint
	 */
	async getPDS(fetchFn?: typeof fetch): Promise<string> {
		return this.resolvePDS(fetchFn);
	}
}

/**
 * Create a new SiteStandardClient instance
 * @param config - Configuration object
 * @returns Configured client instance
 */
export function createClient(config: SiteStandardConfig): SiteStandardClient {
	return new SiteStandardClient(config);
}
