<script lang="ts">
	import RichText from './document/RichText.svelte';
	import Comment from './Comment.svelte';
	import type { CommentRecord, LinearDocumentQuote } from '$lib/types.js';

	interface CommentProps extends CommentRecord {
		uri: string;
		cid: string;
		author: {
			did: string;
			handle?: string;
			displayName?: string;
			avatar?: string;
		};
		replies?: CommentProps[];
	}

	interface Props {
		comment: CommentProps;
		hasTheme?: boolean;
		/** Whether to show the attachment/quote */
		showQuote?: boolean;
		/** Depth in the thread (for styling) */
		depth?: number;
	}

	const { comment, hasTheme = false, showQuote = true, depth = 0 }: Props = $props();

	// Format date
	const formattedDate = $derived(
		new Date(comment.createdAt).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	);

	// Author display name
	const authorName = $derived(
		comment.author.displayName || comment.author.handle || comment.author.did
	);

	// Author profile URL
	const authorUrl = $derived(`https://leaflet.pub/p/${comment.author.did}`);

	// Quote text extraction
	const quoteText = $derived(
		comment.attachment?.quote ? extractQuotePreview(comment.attachment) : null
	);

	function extractQuotePreview(quote: LinearDocumentQuote): string {
		if (quote.quote) {
			return `Quote from block ${quote.quote.start.block.join('.')}`;
		}
		return 'Document quote';
	}
</script>

<article
	class="comment"
	class:themed={hasTheme}
	class:reply={depth > 0}
	style:padding-left={depth > 0 ? '1rem' : undefined}
>
	<header class="comment-header flex items-center gap-3 mb-2">
		{#if comment.author.avatar}
			<img
				src={comment.author.avatar}
				alt={authorName}
				class="w-8 h-8 rounded-full"
			/>
		{:else}
			<div
				class="avatar-placeholder w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
				class:themed={hasTheme}
			>
				{authorName.charAt(0).toUpperCase()}
			</div>
		{/if}

		<div class="flex-1 min-w-0">
			<a
				href={authorUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="author-name font-medium hover:underline"
				class:themed={hasTheme}
			>
				{authorName}
			</a>
			{#if comment.author.handle}
				<span class="author-handle text-sm opacity-60">@{comment.author.handle}</span>
			{/if}
		</div>

		<time datetime={comment.createdAt} class="text-sm opacity-60">
			{formattedDate}
		</time>
	</header>

	<div class="comment-body">
		{#if showQuote && comment.attachment}
			<blockquote class="quote-attachment mb-2 px-3 py-2 border-l-2 text-sm opacity-80">
				{quoteText}
			</blockquote>
		{/if}

		<div class="comment-text">
			<RichText plaintext={comment.plaintext} facets={comment.facets} {hasTheme} />
		</div>
	</div>

	{#if comment.replies && comment.replies.length > 0}
		<div class="replies mt-4 space-y-4 border-l-2 pl-4">
			{#each comment.replies as reply}
				<Comment comment={reply} {hasTheme} {showQuote} depth={depth + 1} />
			{/each}
		</div>
	{/if}
</article>

<style>
	.comment {
		padding: 1rem;
		border-radius: 0.5rem;
		background-color: rgb(249 250 251);
	}

	.comment.themed {
		background-color: color-mix(in srgb, var(--theme-foreground) 5%, transparent);
	}

	.comment.reply {
		background-color: transparent;
	}

	.avatar-placeholder {
		background-color: rgb(229 231 235);
		color: rgb(107 114 128);
	}

	.avatar-placeholder.themed {
		background-color: color-mix(in srgb, var(--theme-accent) 20%, transparent);
		color: var(--theme-accent);
	}

	.author-name {
		color: rgb(0 0 0);
	}

	.author-name.themed {
		color: var(--theme-foreground);
	}

	.quote-attachment {
		border-color: rgb(209 213 219);
		background-color: rgb(255 255 255);
	}

	.comment:global(.themed) .quote-attachment {
		border-color: color-mix(in srgb, var(--theme-foreground) 20%, transparent);
		background-color: color-mix(in srgb, var(--theme-background) 50%, transparent);
	}

	.replies {
		border-color: rgb(229 231 235);
	}

	.replies:global(.themed) {
		border-color: color-mix(in srgb, var(--theme-foreground) 10%, transparent);
	}
</style>
