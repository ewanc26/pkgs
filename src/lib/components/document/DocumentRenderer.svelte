<script lang="ts">
	import type { Document } from '$lib/types.js';
	import LeafletContentRenderer from './LeafletContentRenderer.svelte';
	import { mixThemeColor } from '$lib/utils/theme-helpers.js';

	interface Props {
		document: Document;
		hasTheme?: boolean;
	}

	const { document, hasTheme = false }: Props = $props();

	// Determine if we should render textContent or content
	const shouldRenderTextContent = $derived(!!document.textContent);
	const shouldRenderLeafletContent = $derived(
		!document.textContent && document.content && document.content.$type === 'pub.leaflet.content'
	);
</script>

<div
	class="prose prose-lg max-w-none"
	style:color={hasTheme ? 'var(--theme-foreground)' : undefined}
>
	{#if shouldRenderTextContent}
		<!-- Simple text content with proper whitespace handling -->
		<div class="leading-relaxed whitespace-pre-wrap">{document.textContent}</div>
	{:else if shouldRenderLeafletContent}
		<!-- Render the rich Leaflet content -->
		<LeafletContentRenderer content={document.content} {hasTheme} />
	{:else if document.content}
		<!-- Fallback: show raw content for unknown types -->
		<div
			class="rounded-xl border p-6"
			style:border-color={hasTheme ? mixThemeColor('--theme-foreground', 20) : undefined}
			style:background-color={hasTheme ? mixThemeColor('--theme-foreground', 5) : undefined}
		>
			<p
				class="mb-3 text-sm font-semibold tracking-wider uppercase"
				style:color={hasTheme ? mixThemeColor('--theme-foreground', 60) : undefined}
			>
				Raw Content
			</p>
			<pre
				class="overflow-x-auto text-xs leading-relaxed"
				style:color={hasTheme ? 'var(--theme-foreground)' : undefined}>{JSON.stringify(
					document.content,
					null,
					2
				)}</pre>
		</div>
	{:else}
		<!-- No content at all -->
		<p class="italic opacity-50">No content available</p>
	{/if}
</div>
