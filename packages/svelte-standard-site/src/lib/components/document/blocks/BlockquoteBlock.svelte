<script lang="ts">
	import RichText from '../RichText.svelte';

	interface Props {
		block: {
			plaintext: string;
			facets?: any[];
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();
</script>

<blockquote class="blockquote mt-1 mb-2" class:themed={hasTheme}>
	<RichText plaintext={block.plaintext} facets={block.facets} {hasTheme} />
</blockquote>

<style>
	.blockquote {
		border-left: 2px solid rgb(107 114 128); /* Default gray color */
		padding-left: 0.75rem;
		margin-left: 0.5rem;
	}

	.blockquote.themed {
		border-color: var(--theme-accent);
	}
</style>
