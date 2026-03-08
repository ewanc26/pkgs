<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label?: string;
		children?: Snippet;
	}

	let { label, children }: Props = $props();
</script>

<div class="pds-section-label">
	{#if children}{@render children()}{:else}{label ?? ''}{/if}
</div>

<style>
	.pds-section-label {
		font-weight: 700;
		text-transform: uppercase;
		font-size: 0.72em;
		letter-spacing: 0.12em;
		color: var(--pds-color-green);
		margin-bottom: 0.7rem;
	}
</style>
