<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Text shown in the titlebar after the traffic-light dots. */
		title?: string;
		class?: string;
		children?: Snippet;
	}

	let { title = 'terminal', class: cls = '', children }: Props = $props();
</script>

<div class="pds-card {cls}">
	<div class="pds-card-titlebar">
		<span class="pds-dot" aria-hidden="true"></span>
		<span class="pds-dot" aria-hidden="true"></span>
		<span class="pds-dot" aria-hidden="true"></span>
		<span class="pds-card-title">{title}</span>
	</div>
	<div class="pds-card-body">
		{#if children}{@render children()}{/if}
	</div>
</div>

<style>
	.pds-card {
		width: 100%;
		max-width: 680px;
		overflow: hidden;
		border-radius: 0.5rem;
		background-color: var(--pds-color-mantle);
		border: 1px solid var(--pds-color-surface-1);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--pds-color-green) 6%, transparent),
			0 8px 32px color-mix(in srgb, var(--pds-color-shadow) 50%, transparent);
	}

	.pds-card-titlebar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 1rem;
		background-color: var(--pds-color-surface-0);
		color: var(--pds-color-green);
		border-bottom: 1px solid color-mix(in srgb, var(--pds-color-green) 15%, transparent);
		font-size: 0.75rem;
		min-width: 0;
	}

	.pds-card-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		margin-left: 0.4rem;
	}

	.pds-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
		background-color: color-mix(in srgb, var(--pds-color-green) 25%, transparent);
		border: 1px solid color-mix(in srgb, var(--pds-color-green) 40%, transparent);
	}

	.pds-card-body {
		padding: 1.4rem 1.6rem;
	}

	@media (max-width: 440px) {
		.pds-card-body {
			padding: 1.1rem;
		}
	}
</style>
