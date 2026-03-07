<script lang="ts">
	import RichText from '../RichText.svelte';

	interface Props {
		block: {
			plaintext: string;
			level?: number;
			facets?: any[];
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();

	const level = $derived(block.level || 1);
</script>

{#if level === 1}
	<h2 class="h1Block mt-1 mb-2">
		<RichText plaintext={block.plaintext} facets={block.facets} {hasTheme} />
	</h2>
{:else if level === 2}
	<h3 class="h2Block mt-1 mb-2">
		<RichText plaintext={block.plaintext} facets={block.facets} {hasTheme} />
	</h3>
{:else if level === 3}
	<h4 class="h3Block mt-1 mb-2">
		<RichText plaintext={block.plaintext} facets={block.facets} {hasTheme} />
	</h4>
{:else}
	<h6 class="h6Block mt-1 mb-2">
		<RichText plaintext={block.plaintext} facets={block.facets} {hasTheme} />
	</h6>
{/if}

<style>
	.h1Block {
		font-size: 2rem;
		font-weight: bold;
	}

	.h2Block {
		font-size: 1.625rem;
		font-weight: bold;
	}

	.h3Block {
		font-size: 1.125rem;
		font-weight: bold;
	}

	.h6Block {
		font-size: 1rem;
		font-weight: bold;
	}
</style>
