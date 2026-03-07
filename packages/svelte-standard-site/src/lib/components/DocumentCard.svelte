<script lang="ts">
	import type { Document, Publication, AtProtoRecord } from '../types.js';
	import { extractRkey } from '$lib/index.js';
	import { ThemedCard, ThemedText, DateDisplay, TagList } from './index.js';

	interface Props {
		document: AtProtoRecord<Document>;
		publication?: AtProtoRecord<Publication>;
		class?: string;
		showCover?: boolean;
		href?: string;
	}

	const {
		document,
		publication,
		class: className = '',
		showCover = true,
		href: customHref
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
	{#if showCover && value.coverImage}
		<img
			src={value.coverImage}
			alt="{value.title} cover"
			class="h-48 w-32 shrink-0 rounded-lg object-cover shadow-sm"
		/>
	{/if}

	<div class="flex-1">
		<ThemedText
			{hasTheme}
			element="h3"
			class="group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2 text-2xl font-bold transition-colors"
		>
			{value.title}
		</ThemedText>

		{#if value.description}
			<ThemedText
				{hasTheme}
				opacity={70}
				element="p"
				class="mb-4 line-clamp-3 text-sm leading-relaxed"
			>
				{value.description}
			</ThemedText>
		{/if}

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

		{#if value.tags && value.tags.length > 0}
			<TagList tags={value.tags} {hasTheme} />
		{/if}
	</div>
</ThemedCard>
