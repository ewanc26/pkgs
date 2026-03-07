<script lang="ts">
	import RichText from '../RichText.svelte';

	interface Props {
		block: {
			plaintext: string;
			facets?: any[];
			textSize?: 'default' | 'small' | 'large';
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();

	const textSizeClass = $derived(
		block.textSize === 'small'
			? 'text-sm text-secondary'
			: block.textSize === 'large'
				? 'text-lg'
				: ''
	);
</script>

<p class="textBlock mt-1 mb-2 {textSizeClass}">
	<RichText plaintext={block.plaintext} facets={block.facets} {hasTheme} />
</p>
