<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		block: {
			postRef: {
				uri: string;
				cid: string;
			};
		};
		hasTheme?: boolean;
		postData?: any; // The full post data if already fetched
	}

	const { block, hasTheme = false, postData }: Props = $props();

	let post = $state<any>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Extract post info from AT URI
	function extractPostInfo(uri: string): { did: string; rkey: string } | null {
		const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
		if (!match) return null;
		return { did: match[1], rkey: match[2] };
	}

	const postInfo = $derived(extractPostInfo(block.postRef.uri));
	const postUrl = $derived(
		postInfo ? `https://bsky.app/profile/${postInfo.did}/post/${postInfo.rkey}` : null
	);

	onMount(async () => {
		// Use postData if provided
		if (postData) {
			post = postData;
			loading = false;
			return;
		}

		// You would fetch the post data here from your API or Bluesky API
		// For now, we'll just show a simple link
		loading = false;
	});
</script>

{#if loading}
	<div
		class="relative my-2 flex w-full flex-col gap-2 overflow-hidden rounded-md border bg-white p-3 text-sm dark:bg-gray-900"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<div class="animate-pulse">
			<div class="mb-2 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
			<div class="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
			<div class="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
		</div>
	</div>
{:else if error}
	<div
		class="relative my-2 flex w-full flex-col gap-2 overflow-hidden rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950"
	>
		<p class="text-red-600 dark:text-red-400">Failed to load Bluesky post: {error}</p>
	</div>
{:else if post && post.author && post.record}
	<div
		class="relative my-2 flex w-full flex-col gap-2 overflow-hidden rounded-md border bg-white p-3 text-sm dark:bg-gray-900"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<div class="flex w-full items-center gap-2">
			{#if post.author.avatar}
				<img
					src={post.author.avatar}
					alt="{post.author.displayName}'s avatar"
					class="h-8 w-8 shrink-0 rounded-full border border-gray-200 dark:border-gray-700"
				/>
			{/if}
			<div class="flex grow flex-col gap-0.5 leading-tight">
				<div class="font-bold text-gray-900 dark:text-gray-100">
					{post.author.displayName}
				</div>
				<a
					href="https://bsky.app/profile/{post.author.handle}"
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs text-gray-600 hover:underline dark:text-gray-400"
				>
					@{post.author.handle}
				</a>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			{#if post.record.text}
				<pre class="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{post.record.text}</pre>
			{/if}

			{#if post.embed}
				<div>
					<!-- Embed rendering would go here -->
					<div class="text-sm text-gray-600 italic dark:text-gray-400">[Embedded content]</div>
				</div>
			{/if}
		</div>

		<div class="flex w-full items-center justify-between gap-2 text-gray-600 dark:text-gray-400">
			{#if post.record.createdAt}
				<div class="text-xs">
					{new Date(post.record.createdAt).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
						hour: 'numeric',
						minute: 'numeric',
						hour12: true
					})}
				</div>
			{/if}
			<div class="flex items-center gap-2">
				{#if post.replyCount != null && post.replyCount > 0}
					<span class="flex items-center gap-1 text-xs">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
						{post.replyCount}
					</span>
				{/if}
				{#if post.quoteCount != null && post.quoteCount > 0}
					<span class="flex items-center gap-1 text-xs">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
							/>
						</svg>
						{post.quoteCount}
					</span>
				{/if}
				<a
					href={postUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="transition-opacity hover:opacity-70"
					title="View on Bluesky"
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
						/>
					</svg>
				</a>
			</div>
		</div>
	</div>
{:else if postUrl}
	<div
		class="my-2 rounded-md border bg-white p-6 dark:bg-gray-900"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<div class="mb-3 flex items-center gap-2 text-sm font-medium">
			<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
				/>
			</svg>
			<span style:color={hasTheme ? 'var(--theme-accent)' : undefined}> Bluesky Post </span>
		</div>
		<a
			href={postUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 text-sm font-medium transition-all hover:gap-3"
			style:color={hasTheme ? 'var(--theme-accent)' : undefined}
		>
			View on Bluesky
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M14 5l7 7m0 0l-7 7m7-7H3"
				/>
			</svg>
		</a>
	</div>
{:else}
	<div class="my-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
		<p class="text-sm text-yellow-600 dark:text-yellow-400">Invalid Bluesky post reference</p>
	</div>
{/if}
