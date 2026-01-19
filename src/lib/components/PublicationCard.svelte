<script lang="ts">
	import type { Publication, AtProtoRecord } from '../types.js';
	import { ThemedCard, ThemedText } from './index.js';
	import { ExternalLink } from '@lucide/svelte';

	interface Props {
		publication: AtProtoRecord<Publication>;
		class?: string;
		showExternalIcon?: boolean;
	}

	const { publication, class: className = '', showExternalIcon = true }: Props = $props();

	const value = $derived(publication.value);
	const hasTheme = $derived(!!value.basicTheme);
</script>

<ThemedCard theme={value.basicTheme} class="focus-within:shadow-lg hover:shadow-lg {className}">
	<div class="mb-4 flex gap-4">
		{#if value.icon}
			<img
				src={value.icon}
				alt="{value.name} icon"
				class="size-16 shrink-0 rounded-lg object-cover"
			/>
		{/if}
		<div class="min-w-0 flex-1">
			<ThemedText {hasTheme} element="h3" class="mb-2 text-xl font-semibold">
				{value.name}
			</ThemedText>
			{#if value.description}
				<ThemedText {hasTheme} opacity={70} element="p" class="text-sm">
					{value.description}
				</ThemedText>
			{/if}
		</div>
	</div>
	<a
		href={value.url}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-2 font-medium transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
		class:text-primary-600={!hasTheme}
		class:dark:text-primary-400={!hasTheme}
		class:focus-visible:outline-primary-600={!hasTheme}
		style:color={hasTheme ? 'var(--theme-accent)' : undefined}
		style:outline-color={hasTheme ? 'var(--theme-accent)' : undefined}
	>
		Visit Site
		{#if showExternalIcon}
			<ExternalLink class="size-4" aria-hidden="true" />
		{/if}
	</a>
</ThemedCard>
