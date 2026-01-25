<script lang="ts">
	/**
	 * Comments component for displaying Bluesky replies
	 *
	 * Fetches and displays threaded replies from Bluesky as comments on your blog.
	 *
	 * @example
	 * ```svelte
	 * <Comments
	 *   bskyPostUri="at://did:plc:xxx/app.bsky.feed.post/abc123"
	 *   canonicalUrl="https://yourblog.com/posts/my-post"
	 *   maxDepth={3}
	 * />
	 * ```
	 */

	import { onMount } from 'svelte';
	import { fetchComments, formatRelativeTime, type Comment } from '../utils/comments.js';
	import { MessageSquare, ExternalLink, Heart } from '@lucide/svelte';

	interface Props {
		/** AT-URI of the Bluesky announcement post */
		bskyPostUri: string;
		/** Canonical URL of your blog post */
		canonicalUrl: string;
		/** Maximum nesting depth for replies (default: 3) */
		maxDepth?: number;
		/** Section title (default: "Comments") */
		title?: string;
		/** Show "Reply on Bluesky" link (default: true) */
		showReplyLink?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		bskyPostUri,
		canonicalUrl,
		maxDepth = 3,
		title = 'Comments',
		showReplyLink = true,
		class: className = ''
	}: Props = $props();

	let comments = $state<Comment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Convert AT-URI to HTTPS URL for the reply link
	const bskyUrl = $derived.by(() => {
		const match = bskyPostUri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
		if (!match) return null;
		const [, did, rkey] = match;
		// We'll need to resolve the DID to a handle, but for now use DID
		return `https://bsky.app/profile/${did}/post/${rkey}`;
	});

	onMount(async () => {
		try {
			comments = await fetchComments({
				bskyPostUri,
				canonicalUrl,
				maxDepth
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load comments';
			console.error('Failed to fetch comments:', err);
		} finally {
			loading = false;
		}
	});

	function CommentItem(comment: Comment) {
		const authorUrl = `https://bsky.app/profile/${comment.author.handle}`;
		const postUrl = $derived.by(() => {
			const match = comment.uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
			if (!match) return null;
			return `https://bsky.app/profile/${comment.author.handle}/post/${match[2]}`;
		});

		return {
			comment,
			authorUrl,
			postUrl
		};
	}
</script>

<section class="comments-section {className}">
	<header class="mb-6">
		<h2 class="text-ink-900 dark:text-ink-50 flex items-center gap-2 text-2xl font-bold">
			<MessageSquare size={24} />
			{title}
		</h2>
		{#if showReplyLink && bskyUrl}
			<a
				href={bskyUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-2 inline-flex items-center gap-1 text-sm transition-colors"
			>
				Reply on Bluesky
				<ExternalLink size={14} />
			</a>
		{/if}
	</header>

	{#if loading}
		<div class="text-ink-600 dark:text-ink-400 py-8 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
			<p class="mt-2">Loading comments...</p>
		</div>
	{:else if error}
		<div class="border-canvas-200 bg-canvas-100 dark:border-canvas-700 dark:bg-canvas-800 rounded-lg border p-4">
			<p class="text-ink-900 dark:text-ink-50 font-medium">Failed to load comments</p>
			<p class="text-ink-600 dark:text-ink-400 mt-1 text-sm">{error}</p>
		</div>
	{:else if comments.length === 0}
		<div class="text-ink-600 dark:text-ink-400 py-8 text-center">
			<MessageSquare size={48} class="mx-auto mb-2 opacity-50" />
			<p>No comments yet. Be the first to comment!</p>
			{#if showReplyLink && bskyUrl}
				<a
					href={bskyUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-2 inline-flex items-center gap-1 transition-colors"
				>
					Start the conversation on Bluesky
					<ExternalLink size={14} />
				</a>
			{/if}
		</div>
	{:else}
		<div class="space-y-4">
			{#each comments as comment}
				{@const item = CommentItem(comment)}
				<article
					class="border-canvas-200 bg-canvas-50 dark:border-canvas-700 dark:bg-canvas-900 rounded-lg border p-4"
					style="margin-left: {comment.depth * 1.5}rem"
				>
					<header class="mb-2 flex items-start justify-between">
						<div class="flex items-center gap-3">
							{#if comment.author.avatar}
								<img
									src={comment.author.avatar}
									alt={comment.author.displayName || comment.author.handle}
									class="h-10 w-10 rounded-full"
								/>
							{:else}
								<div class="bg-primary-200 dark:bg-primary-800 flex h-10 w-10 items-center justify-center rounded-full">
									<span class="text-primary-900 dark:text-primary-100 text-sm font-bold">
										{(comment.author.displayName || comment.author.handle)[0].toUpperCase()}
									</span>
								</div>
							{/if}

							<div>
								<a
									href={item.authorUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-ink-900 dark:text-ink-50 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
								>
									{comment.author.displayName || comment.author.handle}
								</a>
								<p class="text-ink-600 dark:text-ink-400 text-sm">@{comment.author.handle}</p>
							</div>
						</div>

						<time class="text-ink-600 dark:text-ink-400 text-sm" datetime={comment.createdAt}>
							{formatRelativeTime(comment.createdAt)}
						</time>
					</header>

					<p class="text-ink-900 dark:text-ink-50 mb-3 whitespace-pre-wrap">{comment.text}</p>

					<footer class="text-ink-600 dark:text-ink-400 flex items-center gap-4 text-sm">
						{#if comment.likeCount > 0}
							<span class="flex items-center gap-1">
								<Heart size={14} />
								{comment.likeCount}
							</span>
						{/if}

						{#if item.postUrl}
							<a
								href={item.postUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 transition-colors"
							>
								View on Bluesky
								<ExternalLink size={12} />
							</a>
						{/if}
					</footer>

					{#if comment.replies && comment.replies.length > 0}
						<div class="mt-4 space-y-4">
							{#each comment.replies as reply}
								{@const replyItem = CommentItem(reply)}
								<article
									class="border-canvas-200 bg-canvas-100 dark:border-canvas-600 dark:bg-canvas-800 rounded-lg border p-4"
								>
									<header class="mb-2 flex items-start justify-between">
										<div class="flex items-center gap-3">
											{#if reply.author.avatar}
												<img
													src={reply.author.avatar}
													alt={reply.author.displayName || reply.author.handle}
													class="h-8 w-8 rounded-full"
												/>
											{:else}
												<div class="bg-primary-200 dark:bg-primary-800 flex h-8 w-8 items-center justify-center rounded-full">
													<span class="text-primary-900 dark:text-primary-100 text-xs font-bold">
														{(reply.author.displayName || reply.author.handle)[0].toUpperCase()}
													</span>
												</div>
											{/if}

											<div>
												<a
													href={replyItem.authorUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="text-ink-900 dark:text-ink-50 hover:text-primary-600 dark:hover:text-primary-400 text-sm font-medium transition-colors"
												>
													{reply.author.displayName || reply.author.handle}
												</a>
												<p class="text-ink-600 dark:text-ink-400 text-xs">@{reply.author.handle}</p>
											</div>
										</div>

										<time class="text-ink-600 dark:text-ink-400 text-xs" datetime={reply.createdAt}>
											{formatRelativeTime(reply.createdAt)}
										</time>
									</header>

									<p class="text-ink-900 dark:text-ink-50 mb-2 whitespace-pre-wrap text-sm">{reply.text}</p>

									<footer class="text-ink-600 dark:text-ink-400 flex items-center gap-4 text-xs">
										{#if reply.likeCount > 0}
											<span class="flex items-center gap-1">
												<Heart size={12} />
												{reply.likeCount}
											</span>
										{/if}

										{#if replyItem.postUrl}
											<a
												href={replyItem.postUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 transition-colors"
											>
												View on Bluesky
												<ExternalLink size={10} />
											</a>
										{/if}
									</footer>
								</article>
							{/each}
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</section>

<style>
	.comments-section {
		margin-top: 3rem;
		margin-bottom: 3rem;
	}
</style>
