<script lang="ts">
	interface Props {
		block: {
			text: string;
			url: string;
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();
</script>

<div class="my-2">
	<a
		href={block.url.trim()}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-block rounded-md px-6 py-3 font-semibold transition-all hover:opacity-90"
		style:background-color={hasTheme ? 'var(--theme-accent)' : '#3b82f6'}
		style:color="white"
	>
		{block.text}
	</a>
</div>
