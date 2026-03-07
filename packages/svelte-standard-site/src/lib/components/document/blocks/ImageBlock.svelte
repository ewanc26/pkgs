<script lang="ts">
	interface Props {
		block: {
			image: {
				src: string;
				height?: number;
				width?: number;
				fallback?: string;
				local?: boolean;
			};
			alt?: string;
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();

	const imageSrc = $derived(block.image.fallback || block.image.src);
	const altText = $derived(block.alt || '');
</script>

<div class="my-2 w-fit">
	<img
		src={imageSrc}
		alt={altText}
		loading="lazy"
		decoding="async"
		height={block.image.height}
		width={block.image.width}
		class="h-auto max-w-full"
	/>
	{#if altText}
		<div class="mt-1 text-xs text-gray-600 italic dark:text-gray-400">
			{altText}
		</div>
	{/if}
</div>
