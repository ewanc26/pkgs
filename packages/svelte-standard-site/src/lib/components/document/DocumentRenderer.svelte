<script lang="ts">
	import type { Document } from '$lib/types.js';
	import LeafletContentRenderer from './LeafletContentRenderer.svelte';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import { mixThemeColor } from '$lib/utils/theme-helpers.js';

	interface Props {
		document: Document;
		/** DID of the record author — needed to resolve blob URLs */
		did?: string;
		/** PDS base URL (e.g. https://pds.example.com) — needed for blob resolution */
		pds?: string;
		hasTheme?: boolean;
		/**
		 * Pre-rendered HTML for the textContent field (server-side).
		 * When provided, skips client-side markdown processing.
		 */
		prerenderedHtml?: string;
	}

	const { document, did = '', pds = '', hasTheme = false, prerenderedHtml }: Props = $props();

	// Content priority:
	//  1. pub.leaflet.content — rich Leaflet block tree
	//  2. textContent — stored as (possibly markdown) text; render via MarkdownRenderer
	//  3. unknown content type — raw JSON fallback
	const hasLeafletContent = $derived(
		!!document.content && (document.content as any).$type === 'pub.leaflet.content'
	);
	const hasTextContent = $derived(!!document.textContent);
	const hasUnknownContent = $derived(!hasLeafletContent && !hasTextContent && !!document.content);
</script>

<div
	class="prose prose-lg max-w-none"
	style:color={hasTheme ? 'var(--theme-foreground)' : undefined}
>
	{#if hasLeafletContent}
		<LeafletContentRenderer content={document.content as any} {did} {pds} {hasTheme} />
	{:else if hasTextContent}
		<MarkdownRenderer
			markdown={document.textContent}
			html={prerenderedHtml}
		/>
	{:else if hasUnknownContent}
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
		<p class="italic opacity-50">No content available</p>
	{/if}
</div>
