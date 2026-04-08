<script lang="ts">
	import type { Document, Publication, AtProtoRecord } from '../types.js';
	import { extractRkey } from '$lib/index.js';
	import { ThemedCard, ThemedText, DateDisplay, TagList } from './index.js';
	import type { Snippet } from 'svelte';

	interface Props {
		document: AtProtoRecord<Document>;
		publication?: AtProtoRecord<Publication>;
		class?: string;
		showCover?: boolean;
		href?: string;
		/**
		 * Custom render snippet for the entire card content.
		 * Receives { document, publication, href }.
		 * If provided, default rendering is replaced entirely.
		 */
		layout?: Snippet<
			[
				{
					document: AtProtoRecord<Document>;
					publication?: AtProtoRecord<Publication>;
					href: string;
				}
			]
		>;
		/**
		 * Custom render snippet for the cover image.
		 * Receives { src, alt }.
		 */
		cover?: Snippet<[{ src: string; alt: string }]>;
		/**
		 * Custom render snippet for the title.
		 * Receives { title, href }.
		 */
		title?: Snippet<[{ title: string; href: string }]>;
		/**
		 * Custom render snippet for the description.
		 * Receives { description }.
		 */
		description?: Snippet<[{ description: string }]>;
		/**
		 * Custom render snippet for the metadata section.
		 * Receives { publishedAt, updatedAt }.
		 */
		metadata?: Snippet<[{ publishedAt: string; updatedAt?: string }]>;
		/**
		 * Custom render snippet for tags.
		 * Receives { tags }.
		 */
		tags?: Snippet<[{ tags: string[] }]>;
	}

	const {
		document,
		publication,
		class: className = '',
		showCover = true,
		href: customHref,
		layout,
		cover,
		title,
		description,
		metadata,
		tags
	}: Props = $props();

	const value = $derived(document.value);
	const hasTheme = $derived(!!publication?.value.basicTheme);

	const pubRkey = $derived(extractRkey(value.site));
	const docRkey = $derived(extractRkey(document.uri));
	const href = $derived(customHref || `/${pubRkey}/${docRkey}`);
</script>

<ThemedCard
	theme={publication?.value.basicTheme}
	{href}
	class="flex gap-6 duration-200 focus-within:shadow-md hover:shadow-md {className}"
>
	{#if layout}
		{@render layout({ document, publication, href })}
	{:else}
		{#if showCover && value.coverImage}
			{#if cover}
				{@render cover({ src: value.coverImage, alt: `${value.title} cover` })}
			{:else}
				<img
					src={value.coverImage}
					alt="{value.title} cover"
					class="h-48 w-32 shrink-0 rounded-lg object-cover shadow-sm"
				/>
			{/if}
		{/if}

		<div class="flex-1">
			{#if title}
				{@render title({ title: value.title, href })}
			{:else}
				<ThemedText
					{hasTheme}
					element="h3"
					class="group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2 text-2xl font-bold transition-colors"
				>
					{value.title}
				</ThemedText>
			{/if}

			{#if value.description}
				{#if description}
					{@render description({ description: value.description })}
				{:else}
					<ThemedText
						{hasTheme}
						opacity={70}
						element="p"
						class="mb-4 line-clamp-3 text-sm leading-relaxed"
					>
						{value.description}
					</ThemedText>
				{/if}
			{/if}

			{#if metadata}
				{@render metadata({ publishedAt: value.publishedAt, updatedAt: value.updatedAt })}
			{:else}
				<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
					<DateDisplay
						date={value.publishedAt}
						class="font-medium"
						style={hasTheme
							? `color: ${hasTheme ? 'color-mix(in srgb, var(--theme-foreground) 80%, transparent)' : ''}`
							: ''}
					/>
					{#if value.updatedAt}
						<span
							class="flex items-center gap-1"
							style:color={hasTheme
								? 'color-mix(in srgb, var(--theme-foreground) 60%, transparent)'
								: undefined}
						>
							<span
								class="h-1 w-1 rounded-full"
								class:bg-ink-400={!hasTheme}
								class:dark:bg-ink-600={!hasTheme}
								style:background-color={hasTheme
									? 'color-mix(in srgb, var(--theme-foreground) 40%, transparent)'
									: undefined}
							></span>
							Updated <DateDisplay date={value.updatedAt} />
						</span>
					{/if}
				</div>
			{/if}

			{#if value.tags && value.tags.length > 0}
				{#if tags}
					{@render tags({ tags: value.tags })}
				{:else}
					<TagList tags={value.tags} {hasTheme} />
				{/if}
			{/if}
		</div>
	{/if}
</ThemedCard>
