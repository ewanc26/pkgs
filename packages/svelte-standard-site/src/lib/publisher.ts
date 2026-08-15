/**
 * Publisher for standard.site documents
 *
 * Publishes documents to ATProto repositories using the standard.site lexicon,
 * enabling your SvelteKit site to sync content to Leaflet, WhiteWind, or any
 * compatible platform.
 *
 * The publisher automatically resolves the correct PDS from your DID document,
 * so it works with any PDS (bsky.app, Blacksky, self-hosted, etc.).
 *
 * @example
 * ```ts
 * import { StandardSitePublisher } from 'svelte-standard-site/publisher';
 *
 * const publisher = new StandardSitePublisher({
 *   identifier: 'your-handle.bsky.social',
 *   password: process.env.ATPROTO_APP_PASSWORD!,
 * });
 *
 * await publisher.login();
 *
 * await publisher.publishDocument({
 *   site: 'https://myblog.com',
 *   title: 'My Blog Post',
 *   publishedAt: new Date().toISOString(),
 * });
 * ```
 */

import { Client } from '@atproto/lex'
import { PasswordSession } from '@atproto/lex-password-session'
import { api } from '@bsky/sdk'
import { com } from '@bsky/sdk/lexicons'
import type { PublisherConfig, Document, Publication } from './schemas.js'
import { PublisherConfigSchema, COLLECTIONS } from './schemas.js'

/**
 * Resolve a handle to a DID using the public API
 */
async function resolveHandle(handle: string): Promise<string> {
	const res = await fetch(
		`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
	);
	if (!res.ok) throw new Error(`Failed to resolve handle: ${handle}`);
	const data = (await res.json()) as { did: string };
	return data.did;
}

/**
 * Get the PDS endpoint from a DID document
 */
async function getPdsFromDid(did: string): Promise<string> {
	let didDoc: any;

	if (did.startsWith('did:plc:')) {
		// Resolve from plc.directory
		const res = await fetch(`https://plc.directory/${did}`);
		if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
		didDoc = await res.json();
	} else if (did.startsWith('did:web:')) {
		// Resolve from the domain
		const domain = did.replace('did:web:', '');
		const res = await fetch(`https://${domain}/.well-known/did.json`);
		if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
		didDoc = await res.json();
	} else {
		throw new Error(`Unsupported DID method: ${did}`);
	}

	// Find the AtprotoPersonalDataServer service
	const pdsService = didDoc.service?.find(
		(s: any) => s.type === 'AtprotoPersonalDataServer' || s.id === '#atproto_pds'
	);

	if (!pdsService?.serviceEndpoint) {
		throw new Error(`No PDS found in DID document for ${did}`);
	}

	return pdsService.serviceEndpoint;
}

/**
 * Generate a TID (Timestamp Identifier) per ATProto spec
 * @see https://atproto.com/specs/tid
 *
 * Structure:
 * - 64-bit integer, big-endian
 * - Top bit always 0
 * - Next 53 bits: microseconds since UNIX epoch
 * - Final 10 bits: random clock identifier
 * - Encoded as base32-sortable (chars: 234567abcdefghijklmnopqrstuvwxyz)
 * - Always 13 characters
 */
const BASE32_SORTABLE = '234567abcdefghijklmnopqrstuvwxyz';

function generateTid(): string {
	const now = Date.now() * 1000; // Convert to microseconds
	const clockId = Math.floor(Math.random() * 1024); // 10 bits

	// Combine: (timestamp << 10) | clockId
	// Ensure top bit is 0 by masking with 0x7FFFFFFFFFFFFFFF
	const tid = ((BigInt(now) << 10n) | BigInt(clockId)) & 0x7fffffffffffffffn;

	// Encode as base32-sortable
	let encoded = '';
	let remaining = tid;
	for (let i = 0; i < 13; i++) {
		const index = Number(remaining & 31n);
		encoded = BASE32_SORTABLE[index] + encoded;
		remaining = remaining >> 5n;
	}

	return encoded;
}

export interface PublishDocumentInput {
	/** Site/publication URI (https or at-uri) - REQUIRED */
	site: string;
	/** Document title - REQUIRED */
	title: string;
	/** When the document was published (ISO 8601) - REQUIRED */
	publishedAt: string;
	/** Path to combine with site URL */
	path?: string;
	/** Document description/excerpt */
	description?: string;
	/** When the document was last updated (ISO 8601) */
	updatedAt?: string;
	/** Tags/categories */
	tags?: string[];
	/** Plain text content for indexing */
	textContent?: string;
	/** Platform-specific content */
	content?: unknown;
	/** Reference to associated Bluesky post */
	bskyPostRef?: { uri: string; cid: string };
	/** Cover image blob */
	coverImage?: {
		$type: 'blob';
		ref: { $link: string };
		mimeType: string;
		size: number;
	};
	/** Document-level preferences (overrides publication defaults) */
	preferences?: {
		showInDiscover?: boolean;
		showComments?: boolean;
		showMentions?: boolean;
		showPrevNext?: boolean;
		showRecommends?: boolean;
	};
}

export interface PublishPublicationInput {
	/** Publication name */
	name: string;
	/** Base URL */
	url: string;
	/** Description */
	description?: string;
	/** Icon blob */
	icon?: {
		$type: 'blob';
		ref: { $link: string };
		mimeType: string;
		size: number;
	};
	/** Basic theme colors */
	basicTheme?: {
		background: { r: number; g: number; b: number };
		foreground: { r: number; g: number; b: number };
		accent: { r: number; g: number; b: number };
		accentForeground: { r: number; g: number; b: number };
	};
	/** Publication preferences */
	preferences?: {
		showInDiscover?: boolean;
		showComments?: boolean;
		showMentions?: boolean;
		showPrevNext?: boolean;
		showRecommends?: boolean;
	};
}

export interface PublishResult {
	uri: string;
	cid: string;
}

/**
 * Publisher for standard.site documents on ATProto
 */
export class StandardSitePublisher {
	private client: Client | null = null;
	private config: PublisherConfig;
	private did: string | null = null;
	private pdsUrl: string | null = null;
	private session: Awaited<ReturnType<typeof PasswordSession.login>> | null = null;

	constructor(config: Partial<PublisherConfig>) {
		this.config = PublisherConfigSchema.parse(config);
	}

	async login(): Promise<void> {
		let did = this.config.identifier;
		if (!did.startsWith('did:')) {
			did = await resolveHandle(this.config.identifier);
		}
		this.did = did;

		if (this.config.service) {
			this.pdsUrl = this.config.service;
		} else {
			this.pdsUrl = await getPdsFromDid(did);
		}

		this.session = await PasswordSession.login({
			service: this.pdsUrl,
			identifier: this.config.identifier,
			password: this.config.password,
		});
		this.client = new Client(this.session, { service: api.app.service });
	}

	/**
	 * Get the authenticated DID
	 */
	getDid(): string {
		if (!this.did) {
			throw new Error('Not logged in. Call login() first.');
		}
		return this.did;
	}

	/**
	 * Get the PDS URL being used
	 */
	getPdsUrl(): string {
		if (!this.pdsUrl) {
			throw new Error('Not logged in. Call login() first.');
		}
		return this.pdsUrl;
	}

	private getClient(): Client {
		if (!this.client) {
			throw new Error('Not logged in. Call login() first.');
		}
		return this.client;
	}

	/**
	 * Publish a document record
	 */
	async publishDocument(input: PublishDocumentInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Document = {
			$type: 'site.standard.document',
			site: input.site,
			title: input.title,
			publishedAt: input.publishedAt,
			path: input.path,
			description: input.description,
			updatedAt: input.updatedAt,
			tags: input.tags,
			textContent: input.textContent,
			content: input.content,
			bskyPostRef: input.bskyPostRef,
			coverImage: input.coverImage,
			preferences: input.preferences
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Document;

		const rkey = generateTid();

		const response = (await client.call(com.atproto.repo.createRecord.main as any, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			rkey,
			record: cleanRecord
		})) as any;

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	/**
	 * Update an existing document
	 */
	async updateDocument(rkey: string, input: PublishDocumentInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Document = {
			$type: 'site.standard.document',
			site: input.site,
			title: input.title,
			publishedAt: input.publishedAt,
			path: input.path,
			description: input.description,
			updatedAt: input.updatedAt ?? new Date().toISOString(),
			tags: input.tags,
			textContent: input.textContent,
			content: input.content,
			bskyPostRef: input.bskyPostRef,
			coverImage: input.coverImage,
			preferences: input.preferences
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Document;

		const response = (await client.call(com.atproto.repo.putRecord.main as any, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			rkey,
			record: cleanRecord
		})) as any;

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	async deleteDocument(rkey: string): Promise<void> {
		const did = this.getDid();
		const client = this.getClient();

		await client.call(com.atproto.repo.deleteRecord.main as any, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			rkey
		});
	}

	async publishPublication(input: PublishPublicationInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Publication = {
			$type: 'site.standard.publication',
			name: input.name,
			url: input.url,
			description: input.description,
			icon: input.icon,
			basicTheme: input.basicTheme,
			preferences: input.preferences
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Publication;

		// Generate TID for record key per lexicon spec (key: "tid")
		const rkey = generateTid();

		const response = (await client.call(com.atproto.repo.createRecord.main as any, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			rkey,
			record: cleanRecord
		})) as any;

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	async updatePublication(rkey: string, input: PublishPublicationInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Publication = {
			$type: 'site.standard.publication',
			name: input.name,
			url: input.url,
			description: input.description,
			icon: input.icon,
			basicTheme: input.basicTheme,
			preferences: input.preferences
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Publication;

		const response = (await client.call(com.atproto.repo.putRecord.main as any, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			rkey,
			record: cleanRecord
		})) as any;

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	async deletePublication(rkey: string): Promise<void> {
		const did = this.getDid();
		const client = this.getClient();

		await client.call(com.atproto.repo.deleteRecord.main as any, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			rkey
		});
	}

	async listDocuments(
		limit = 100
	): Promise<Array<{ uri: string; cid: string; value: Document }>> {
		const did = this.getDid();
		const client = this.getClient();

		const response = (await client.call(com.atproto.repo.listRecords.main as any, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			limit
		})) as any;

		return response.records.map((r: any) => ({
			uri: r.uri,
			cid: r.cid,
			value: r.value as Document
		}));
	}

	async listPublications(
		limit = 100
	): Promise<Array<{ uri: string; cid: string; value: Publication }>> {
		const did = this.getDid();
		const client = this.getClient();

		const response = (await client.call(com.atproto.repo.listRecords.main as any, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			limit
		})) as any;

		return response.records.map((r: any) => ({
			uri: r.uri,
			cid: r.cid,
			value: r.value as Publication
		}));
	}

	getAtpAgent(): Client {
		return this.getClient();
	}

	// ============================================
	// Comment Methods (pub.leaflet.comment)
	// ============================================

	/**
	 * Publish a comment on a document
	 */
	async publishComment(input: {
		/** AT-URI of the document being commented on */
		subject: string;
		/** Comment text */
		plaintext: string;
		/** Facets for rich text */
		facets?: any[];
		/** Parent comment AT-URI if replying */
		parent?: string;
		/** Page ID if commenting on a specific page */
		onPage?: string;
		/** Quote attachment */
		attachment?: {
			document: string;
			quote?: {
				start: { block: number[]; offset: number };
				end: { block: number[]; offset: number };
			};
		};
	}): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: any = {
			$type: 'pub.leaflet.comment',
			subject: input.subject,
			plaintext: input.plaintext,
			createdAt: new Date().toISOString()
		};

		if (input.parent) {
			record.reply = {
				$type: 'pub.leaflet.comment#replyRef',
				parent: input.parent
			};
		}

		if (input.facets) {
			record.facets = input.facets;
		}

		if (input.onPage) {
			record.onPage = input.onPage;
		}

		if (input.attachment) {
			record.attachment = {
				$type: 'pub.leaflet.comment#linearDocumentQuote',
				...input.attachment
			};
		}

		const rkey = generateTid();

		const response = (await client.call(com.atproto.repo.createRecord.main as any, {
			repo: did,
			collection: 'pub.leaflet.comment',
			rkey,
			record
		})) as any;

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	/**
	 * Delete a comment
	 */
	async deleteComment(rkey: string): Promise<void> {
		const did = this.getDid();
		const client = this.getClient();

		await client.call(com.atproto.repo.deleteRecord.main as any, {
			repo: did,
			collection: 'pub.leaflet.comment',
			rkey
		});
	}

	// ============================================
	// Recommend Methods (pub.leaflet.interactions.recommend)
	// ============================================

	/**
	 * Recommend a document
	 */
	async recommendDocument(subject: string): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record = {
			$type: 'pub.leaflet.interactions.recommend',
			subject,
			createdAt: new Date().toISOString()
		};

		const rkey = generateTid();

		const response = (await client.call(com.atproto.repo.createRecord.main as any, {
			repo: did,
			collection: 'pub.leaflet.interactions.recommend',
			rkey,
			record
		})) as any;

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	/**
	 * Remove a recommendation
	 */
	async unrecommendDocument(rkey: string): Promise<void> {
		const did = this.getDid();
		const client = this.getClient();

		await client.call(com.atproto.repo.deleteRecord.main as any, {
			repo: did,
			collection: 'pub.leaflet.interactions.recommend',
			rkey
		});
	}

	/**
	 * Check if the current user has recommended a document
	 */
	async hasRecommended(subject: string): Promise<{ recommended: boolean; rkey?: string }> {
		const did = this.getDid();
		const client = this.getClient();

		const response = (await client.call(com.atproto.repo.listRecords.main as any, {
			repo: did,
			collection: 'pub.leaflet.interactions.recommend',
			limit: 100
		})) as any;

		const record = response.records.find(
			(r: any) => r.value?.subject === subject
		);

		if (record) {
			const rkey = record.uri.split('/').pop();
			return { recommended: true, rkey };
		}

		return { recommended: false };
	}

	// ============================================
	// Subscription Methods (site.standard.graph.subscription)
	// ============================================

	/**
	 * Subscribe to a publication
	 */
	async subscribeToPublication(publication: string): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record = {
			$type: 'site.standard.graph.subscription',
			publication
		};

		const rkey = generateTid();

		const response = (await client.call(com.atproto.repo.createRecord.main as any, {
			repo: did,
			collection: 'site.standard.graph.subscription',
			rkey,
			record
		})) as any;

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	/**
	 * Unsubscribe from a publication
	 */
	async unsubscribeFromPublication(rkey: string): Promise<void> {
		const did = this.getDid();
		const client = this.getClient();

		await client.call(com.atproto.repo.deleteRecord.main as any, {
			repo: did,
			collection: 'site.standard.graph.subscription',
			rkey
		});
	}

	/**
	 * List subscriptions for the current user
	 */
	async listSubscriptions(
		limit = 100
	): Promise<Array<{ uri: string; cid: string; value: { publication: string } }>> {
		const did = this.getDid();
		const client = this.getClient();

		const response = (await client.call(com.atproto.repo.listRecords.main as any, {
			repo: did,
			collection: 'site.standard.graph.subscription',
			limit
		})) as any;

		return response.records.map((r: any) => ({
			uri: r.uri,
			cid: r.cid,
			value: r.value as { publication: string }
		}));
	}

	/**
	 * Check if subscribed to a publication
	 */
	async isSubscribed(publication: string): Promise<{ subscribed: boolean; rkey?: string }> {
		const did = this.getDid();
		const client = this.getClient();

		const response = (await client.call(com.atproto.repo.listRecords.main as any, {
			repo: did,
			collection: 'site.standard.graph.subscription',
			limit: 100
		})) as any;

		const record = response.records.find(
			(r: any) => r.value?.publication === publication
		);

		if (record) {
			const rkey = record.uri.split('/').pop();
			return { subscribed: true, rkey };
		}

		return { subscribed: false };
	}
}

export type { PublisherConfig };
