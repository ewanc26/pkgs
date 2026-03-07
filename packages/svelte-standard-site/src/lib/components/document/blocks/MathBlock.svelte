<script lang="ts">
	import { onMount } from 'svelte';
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	interface Props {
		block: {
			tex: string;
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();

	let html = $state('');

	onMount(() => {
		html = katex.renderToString(block.tex, {
			displayMode: true,
			output: 'html',
			throwOnError: false
		});
	});
</script>

<div class="math-block my-2">
	{@html html}
</div>

<style>
	.math-block :global(.katex-display) {
		margin: 0;
	}
</style>
