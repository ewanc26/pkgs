/**
 * Comments utilities for fetching Bluesky replies
 *
 * Fetches threaded replies from Bluesky to display as comments on your blog.
 *
 * @example
 * ```ts
 * import { fetchComments } from 'svelte-standard-site/comments';
 *
 * const comments = await fetchComments({
 *   bskyPostUri: 'at://did:plc:xxx/app.bsky.feed.post/abc123',
 *   canonicalUrl: 'https://yourblog.com/posts/my-post',
 *   maxDepth: 3,
 * });
 * ```
 */

import { AtpAgent } from '@atproto/api';

export interface CommentAuthor {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
}

export interface Comment {
	uri: string;
	cid: string;
	author: CommentAuthor;
	text: string;
	createdAt: string;
	likeCount: number;
	replyCount: number;
	replies?: Comment[];
	depth: number;
}

export interface FetchCommentsOptions {
	/** AT-URI of the announcement post (e.g., at://did:plc:xxx/app.bsky.feed.post/abc123) */
	bskyPostUri: string;
	/** Optional canonical URL to search for mentions */
	canonicalUrl?: string;
	/** Maximum depth for nested replies (default: 3) */
	maxDepth?: number;
	/** Optional fetch function for SSR */
	fetchFn?: typeof fetch;
}

/**
 * Parse an AT-URI to extract components
 */
function parseAtUri(uri: string): { did: string; collection: string; rkey: string } | null {
	const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
	if (!match) return null;
	return {
		did: match[1],
		collection: match[2],
		rkey: match[3]
	};
}

/**
 * Fetch a single thread of replies
 */
async function fetchThread(
	agent: AtpAgent,
	uri: string,
	maxDepth: number,
	currentDepth = 0
): Promise<Comment | null> {
	try {
		const response = await agent.getPostThread({
			uri,
			depth: maxDepth - currentDepth,
			parentHeight: 0
		});

		const thread = response.data.thread;

		if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
			return null;
		}

		const post = thread.post;

		// Build comment object
		const comment: Comment = {
			uri: post.uri,
			cid: post.cid,
			author: {
				did: post.author.did,
				handle: post.author.handle,
				displayName: post.author.displayName,
				avatar: post.author.avatar
			},
			text: (post.record as any)?.text || '',
			createdAt: post.indexedAt,
			likeCount: post.likeCount || 0,
			replyCount: post.replyCount || 0,
			depth: currentDepth,
			replies: []
		};

		// Process replies if within depth limit
		if (thread.replies && currentDepth < maxDepth) {
			for (const reply of thread.replies) {
				if (reply.$type === 'app.bsky.feed.defs#threadViewPost') {
					const replyComment = await fetchThread(
						agent,
						reply.post.uri,
						maxDepth,
						currentDepth + 1
					);
					if (replyComment) {
						comment.replies!.push(replyComment);
					}
				}
			}
		}

		return comment;
	} catch (error) {
		console.error(`Failed to fetch thread for ${uri}:`, error);
		return null;
	}
}

/**
 * Fetch comments for a blog post
 *
 * @param options - Configuration options
 * @returns Array of top-level comments with nested replies
 */
export async function fetchComments(options: FetchCommentsOptions): Promise<Comment[]> {
	const { bskyPostUri, canonicalUrl, maxDepth = 3 } = options;

	// Parse the post URI
	const parsed = parseAtUri(bskyPostUri);
	if (!parsed) {
		console.error('Invalid AT-URI:', bskyPostUri);
		return [];
	}

	try {
		// Create agent
		const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

		// Fetch the main thread
		const mainComment = await fetchThread(agent, bskyPostUri, maxDepth, 0);

		if (!mainComment || !mainComment.replies) {
			return [];
		}

		// Return only the replies (not the original post)
		return mainComment.replies;
	} catch (error) {
		console.error('Failed to fetch comments:', error);
		return [];
	}
}

/**
 * Search for mentions of a URL and fetch those threads as comments
 *
 * This is useful if people share your blog post on Bluesky without
 * replying to a specific announcement post.
 */
export async function fetchMentionComments(
	canonicalUrl: string,
	maxDepth = 3
): Promise<Comment[]> {
	try {
		const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

		// Search for posts mentioning the URL
		const searchResponse = await agent.app.bsky.feed.searchPosts({
			q: canonicalUrl,
			limit: 25
		});

		const comments: Comment[] = [];

		for (const post of searchResponse.data.posts) {
			const comment = await fetchThread(agent, post.uri, maxDepth, 0);
			if (comment) {
				comments.push(comment);
			}
		}

		return comments;
	} catch (error) {
		console.error('Failed to fetch mention comments:', error);
		return [];
	}
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return 'just now';
	if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

	return date.toLocaleDateString();
}
