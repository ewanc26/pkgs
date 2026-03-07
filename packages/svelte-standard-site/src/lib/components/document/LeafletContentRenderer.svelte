<script lang="ts">
	import LinearDocumentRenderer from './LinearDocumentRenderer.svelte';
	import CanvasRenderer from './CanvasRenderer.svelte';

	interface LinearDocumentPage {
		$type: 'pub.leaflet.pages.linearDocument';
		id?: string;
		blocks: Array<{
			$type: 'pub.leaflet.pages.linearDocument#block';
			block: any;
			alignment?: string;
		}>;
	}

	interface CanvasPage {
		$type: 'pub.leaflet.pages.canvas';
		id?: string;
		blocks: Array<{
			$type: 'pub.leaflet.pages.canvas#block';
			block: any;
			x: number;
			y: number;
			width: number;
			height?: number;
			rotation?: number;
		}>;
	}

	type Page = LinearDocumentPage | CanvasPage;

	interface LeafletContent {
		$type: 'pub.leaflet.content';
		pages: Page[];
	}

	interface Props {
		content: LeafletContent;
		hasTheme?: boolean;
	}

	const { content, hasTheme = false }: Props = $props();
</script>

{#if content.pages && content.pages.length > 0}
	{#each content.pages as page, index}
		{#if page.$type === 'pub.leaflet.pages.linearDocument'}
			<LinearDocumentRenderer {page} {hasTheme} />
		{:else if page.$type === 'pub.leaflet.pages.canvas'}
			<CanvasRenderer {page} {hasTheme} />
		{:else}
			<!-- Unknown page type -->
			<div class="my-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
				<p class="text-sm text-yellow-600 dark:text-yellow-400">
					Unknown page type: <code class="font-mono text-xs"
						>{(page as any).$type || 'unknown'}</code
					>
				</p>
			</div>
		{/if}
	{/each}
{:else}
	<p class="italic opacity-50">No pages found in content</p>
{/if}
