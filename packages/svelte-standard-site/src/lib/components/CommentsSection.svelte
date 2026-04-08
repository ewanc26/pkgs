<script lang="ts">
	import Comment from './Comment.svelte';
	import { organizeCommentsIntoThreads } from '$lib/utils/native-comments.js';

	interface CommentProps {
		uri: string;
		cid: string;
		author: {
			did: string;
			handle?: string;
			displayName?: string;
			avatar?: string;
		};
		replies?: CommentProps[];
		$type: 'pub.leaflet.comment';
		subject: string;
		plaintext: string;
		createdAt: string;
		facets?: any[];
		attachment?: any;
	}

	interface Props {
		/** AT-URI of the document */
		subject: string;
		/** Raw comments from API */
		comments?: Array<any>;
		/** Pre-organized comment threads */
		threads?: CommentProps[];
		hasTheme?: boolean;
		/** Show quote attachments */
		showQuotes?: boolean;
	}

	const { subject, comments = [], threads: propThreads, hasTheme = false, showQuotes = true }: Props = $props();

	// Organize comments into threads if not provided
	const commentThreads = $derived(
		propThreads ?? organizeCommentsIntoThreads(comments)
	);

	// Total comment count
	const totalComments = $derived(
		commentThreads.reduce((sum, thread) => sum + countThread(thread), 0)
	);

	function countThread(thread: any): number {
		let count = 1;
		if (thread.replies) {
			for (const reply of thread.replies) {
				count += countThread(reply);
			}
		}
		return count;
	}
</script>

<section class="comments-section" class:themed={hasTheme}>
	<header class="comments-header mb-6">
		<h2 class="text-xl font-semibold">
			Comments
			{#if totalComments > 0}
				<span class="text-sm font-normal opacity-60">({totalComments})</span>
			{/if}
		</h2>
	</header>

	{#if commentThreads.length === 0}
		<p class="text-sm opacity-60">No comments yet.</p>
	{:else}
		<div class="comments-list space-y-4">
			{#each commentThreads as thread}
				<Comment comment={thread} {hasTheme} showQuote={showQuotes} />
			{/each}
		</div>
	{/if}
</section>

<style>
	.comments-section {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgb(229 231 235);
	}

	.comments-section.themed {
		border-top-color: color-mix(in srgb, var(--theme-foreground) 10%, transparent);
	}
</style>
