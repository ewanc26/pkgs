/**
 * Native Comments utilities for pub.leaflet.comment records
 */

import type { CommentRecord, Facet, LinearDocumentQuote } from '../types.js';

/** Collection name for comments */
export const COMMENTS_COLLECTION = 'pub.leaflet.comment';

/**
 * Create a comment record
 */
export function createCommentRecord(params: {
	subject: string; // AT-URI of the document being commented on
	plaintext: string;
	reply?: { parent: string }; // AT-URI of the parent comment if replying
	facets?: Facet[];
	onPage?: string; // Page ID if commenting on a specific page
	attachment?: LinearDocumentQuote;
}): CommentRecord {
	const record: CommentRecord = {
		$type: 'pub.leaflet.comment',
		subject: params.subject,
		plaintext: params.plaintext,
		createdAt: new Date().toISOString()
	};

	if (params.reply) {
		record.reply = {
			$type: 'pub.leaflet.comment#replyRef',
			parent: params.reply.parent
		};
	}

	if (params.facets) {
		record.facets = params.facets;
	}

	if (params.onPage) {
		record.onPage = params.onPage;
	}

	if (params.attachment) {
		record.attachment = {
			$type: 'pub.leaflet.comment#linearDocumentQuote',
			...params.attachment
		};
	}

	return record;
}

/**
 * Parse a comment AT-URI to extract components
 */
export function parseCommentUri(uri: string): {
	did: string;
	collection: string;
	rkey: string;
} | null {
	const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
	if (!match) return null;

	return {
		did: match[1],
		collection: match[2],
		rkey: match[3]
	};
}

/**
 * Build a comment AT-URI
 */
export function buildCommentUri(did: string, rkey: string): string {
	return `at://${did}/${COMMENTS_COLLECTION}/${rkey}`;
}

/**
 * Fetch comments for a document
 */
export async function fetchComments(
	subject: string,
	service = 'https://public.api.bsky.app'
): Promise<Array<CommentRecord & { uri: string; cid: string; author: { did: string } }>> {
	try {
		const response = await fetch(
			`${service}/xrpc/com.atproto.repo.listRecords?collection=${COMMENTS_COLLECTION}&limit=100`
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch comments: ${response.status}`);
		}

		const data = await response.json();

		// Filter comments for this subject
		const comments = data.records
			?.filter((record: any) => record.value?.subject === subject)
			?.map((record: any) => ({
				...record.value,
				uri: record.uri,
				cid: record.cid,
				author: { did: record.uri.split('/')[2] }
			})) ?? [];

		return comments;
	} catch (error) {
		console.error('Error fetching comments:', error);
		return [];
	}
}

/**
 * Organize comments into a threaded structure
 */
export function organizeCommentsIntoThreads(
	comments: Array<CommentRecord & { uri: string; cid: string; author: { did: string } }>
): Array<CommentRecord & { uri: string; cid: string; author: { did: string }; replies: any[] }> {
	const byId = new Map<string, any>();
	const rootComments: any[] = [];

	// First pass: create all comment objects
	for (const comment of comments) {
		byId.set(comment.uri, { ...comment, replies: [] });
	}

	// Second pass: organize into threads
	for (const comment of comments) {
		const node = byId.get(comment.uri);
		if (!node) continue;

		if (comment.reply?.parent) {
			const parent = byId.get(comment.reply.parent);
			if (parent) {
				parent.replies.push(node);
			} else {
				// Parent not found, treat as root
				rootComments.push(node);
			}
		} else {
			rootComments.push(node);
		}
	}

	// Sort root comments by date (newest first)
	rootComments.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);

	return rootComments;
}

/**
 * Count total comments in a thread
 */
export function countThreadComments(thread: { replies: any[] }): number {
	let count = 1;
	for (const reply of thread.replies) {
		count += countThreadComments(reply);
	}
	return count;
}

/**
 * Get quoted text from a document
 */
export function extractQuotedText(
	document: any,
	quote: LinearDocumentQuote['quote']
): string | null {
	if (!quote || !document?.content?.pages) return null;

	// Find the linear document page
	const page = document.content.pages.find((p: any) =>
		quote.start.block.every((b, i) => b === p.id || i === 0)
	);

	if (!page) return null;

	// Extract text based on block indices
	const blocks = page.blocks || [];
	const startBlockIndex = quote.start.block[quote.start.block.length - 1];
	const endBlockIndex = quote.end.block[quote.end.block.length - 1];

	if (startBlockIndex === undefined || endBlockIndex === undefined) return null;

	// For simplicity, return the text from the first block
	// In a real implementation, you'd handle multi-block quotes
	const startBlock = blocks[startBlockIndex]?.block;
	if (!startBlock) return null;

	if (startBlock.plaintext) {
		return startBlock.plaintext.slice(quote.start.offset, quote.end.offset);
	}

	return null;
}
