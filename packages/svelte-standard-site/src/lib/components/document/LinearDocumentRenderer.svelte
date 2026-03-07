<script lang="ts">
	import BlockRenderer from './BlockRenderer.svelte';

	interface LinearDocumentPage {
		$type: 'pub.leaflet.pages.linearDocument';
		id?: string;
		blocks: Array<{
			$type: 'pub.leaflet.pages.linearDocument#block';
			block: any;
			alignment?: string;
		}>;
	}

	interface Props {
		page: LinearDocumentPage;
		hasTheme?: boolean;
	}

	const { page, hasTheme = false }: Props = $props();

	function getAlignmentClass(alignment?: string): string {
		if (!alignment) return '';
		switch (alignment) {
			case '#textAlignLeft':
				return 'text-left';
			case '#textAlignCenter':
				return 'text-center';
			case '#textAlignRight':
				return 'text-right';
			case '#textAlignJustify':
				return 'text-justify';
			default:
				return '';
		}
	}
</script>

<div class="space-y-6">
	{#each page.blocks as blockWrapper, index}
		<div class={getAlignmentClass(blockWrapper.alignment)}>
			<BlockRenderer block={blockWrapper.block} {hasTheme} />
		</div>
	{/each}
</div>
