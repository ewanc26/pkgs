<script lang="ts">
	/** A single row in the key-value status grid. */
	export interface KVItem {
		key: string;
		value: string;
		/** Visual state applied to the value cell. */
		status?: 'ok' | 'warn' | 'err' | 'loading';
	}

	interface Props {
		items: KVItem[];
	}

	let { items }: Props = $props();
</script>

<div class="pds-kv-grid" role="list">
	{#each items as item (item.key)}
		<span class="pds-kv-key" role="term">{item.key}</span>
		<span class="pds-kv-val {item.status ?? ''}" role="definition">{item.value}</span>
	{/each}
</div>

<style>
	.pds-kv-grid {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.25rem 1.2rem;
		font-size: 0.88em;
		margin-bottom: 1.4rem;
	}

	.pds-kv-key {
		color: var(--pds-color-green);
		opacity: 0.6;
		white-space: nowrap;
	}

	.pds-kv-val {
		color: var(--pds-color-text);
		word-break: break-all;
		min-width: 0;
	}

	.pds-kv-val.ok {
		color: var(--pds-color-green);
	}
	.pds-kv-val.warn {
		color: var(--pds-color-yellow);
	}
	.pds-kv-val.err {
		color: var(--pds-color-red);
	}
	.pds-kv-val.loading {
		color: var(--pds-color-surface-1);
		animation: pds-kv-pulse 1.2s ease-in-out infinite;
	}

	@keyframes pds-kv-pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}

	@media (max-width: 440px) {
		.pds-kv-grid {
			grid-template-columns: 1fr;
			gap: 0;
		}

		.pds-kv-key {
			text-transform: uppercase;
			opacity: 1;
			font-size: 0.7em;
			letter-spacing: 0.1em;
			margin-top: 0.7rem;
		}

		.pds-kv-key:first-child {
			margin-top: 0;
		}
	}
</style>
