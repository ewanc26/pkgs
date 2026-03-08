<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		text?: string;
		children?: Snippet;
	}

	let { text, children }: Props = $props();
</script>

<p class="pds-tagline">
	{#if children}{@render children()}{:else}{text ?? ''}{/if}
</p>

<style>
	.pds-tagline {
		color: var(--pds-color-overlay-0);
		font-size: 0.82em;
		margin-top: 0.2rem;
		margin-bottom: 1.4rem;
		line-height: 1.5;
	}
</style>
