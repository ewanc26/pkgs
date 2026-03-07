<script lang="ts">
	import BlockRenderer from './BlockRenderer.svelte';

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

	interface Props {
		page: CanvasPage;
		did?: string;
		pds?: string;
		hasTheme?: boolean;
	}

	const { page, did = '', pds = '', hasTheme = false }: Props = $props();
</script>

<div class="relative min-h-screen w-full">
	{#each page.blocks as blockWrapper}
		<div
			class="absolute"
			style:left="{blockWrapper.x}px"
			style:top="{blockWrapper.y}px"
			style:width="{blockWrapper.width}px"
			style:height={blockWrapper.height ? `${blockWrapper.height}px` : 'auto'}
			style:transform={blockWrapper.rotation ? `rotate(${blockWrapper.rotation}deg)` : undefined}
		>
			<BlockRenderer block={blockWrapper.block} {did} {pds} {hasTheme} />
		</div>
	{/each}
</div>
