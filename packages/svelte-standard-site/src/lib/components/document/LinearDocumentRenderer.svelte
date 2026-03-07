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
		did?: string;
		pds?: string;
		hasTheme?: boolean;
	}

	const { page, did = '', pds = '', hasTheme = false }: Props = $props();

	function getAlignmentClass(alignment?: string): string {
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
	{#each page.blocks as blockWrapper}
		<div class={getAlignmentClass(blockWrapper.alignment)}>
			<BlockRenderer block={blockWrapper.block} {did} {pds} {hasTheme} />
		</div>
	{/each}
</div>
