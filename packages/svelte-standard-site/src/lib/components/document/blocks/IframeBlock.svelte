<script lang="ts">
	interface Props {
		block: {
			url: string;
			height?: number;
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();

	const height = $derived(block.height || 360);
</script>

<div class="my-2 w-full">
	<div
		class="overflow-hidden rounded-md border"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<iframe
			width="100%"
			{height}
			src={block.url}
			allow="fullscreen"
			loading="lazy"
			title="Embedded content"
			class="border-0"
		></iframe>
	</div>
</div>
