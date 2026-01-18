<script lang="ts">
	import type { Document, AtProtoRecord } from '../types.js';
	import { getDocumentSlug } from '../utils/document.js';
	import { extractRkey } from '$lib/index.js';

	interface Props {
		document: AtProtoRecord<Document>;
		class?: string;
		showCover?: boolean;
	}

	const { document, class: className = '', showCover = true }: Props = $props();

	const value = $derived(document.value);

	// Construct the rkey-based URL: /[pub_rkey]/[doc_rkey]
	const pubRkey = $derived(extractRkey(value.site));
	const docRkey = $derived(extractRkey(document.uri));
	const href = $derived(`/${pubRkey}/${docRkey}`);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<a {href} class="group block">
	<article
		class="flex gap-6 rounded-xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:border-blue-300 hover:shadow-md {className}"
	>
		{#if showCover && value.coverImage}
			<img
				src={value.coverImage}
				alt="{value.title} cover"
				class="h-48 w-32 shrink-0 rounded-lg object-cover shadow-sm"
			/>
		{/if}

		<div class="flex-1">
			<h3 class="mb-2 text-2xl font-bold text-gray-900 transition-colors group-hover:text-blue-600">
				{value.title}
			</h3>

			{#if value.description}
				<p class="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600">
					{value.description}
				</p>
			{/if}

			<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
				<time class="font-medium text-gray-700">{formatDate(value.publishedAt)}</time>
				{#if value.updatedAt}
					<span class="flex items-center gap-1">
						<span class="h-1 w-1 rounded-full bg-gray-300"></span>
						Updated {formatDate(value.updatedAt)}
					</span>
				{/if}
			</div>

			{#if value.tags && value.tags.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each value.tags as tag}
						<span class="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
							#{tag}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</article>
</a>
