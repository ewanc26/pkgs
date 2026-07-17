<script lang="ts">
	import { onMount } from 'svelte';
	import KVGrid from './KVGrid.svelte';
	import type { KVItem } from './KVGrid.svelte';

	interface AccountDetail {
		did: string;
		records: number;
		blobs: number;
		blobBytes: number;
		blobBytesHuman: string;
		repoBytes: number;
		repoBytesHuman: string;
	}

	interface Stats {
		accounts?: number;
		activeAccounts?: number;
		repos?: number;
		records?: number;
		blobs?: number;
		blobBytes?: number;
		blobBytesHuman?: string;
		repoBytes?: number;
		repoBytesHuman?: string;
		inviteCodes?: number;
		diskUsage?: number;
		diskUsageHuman?: string;
		accountDetails?: AccountDetail[];
	}

	interface Props {
		/** Base URL to prepend to `/stats` calls. Defaults to '' (same origin). */
		baseUrl?: string;
	}

	let { baseUrl = '' }: Props = $props();

	const LOADING_ITEMS: KVItem[] = [
		{ key: 'accounts', value: '…', status: 'loading' },
		{ key: 'repos', value: '…', status: 'loading' },
		{ key: 'records', value: '…', status: 'loading' },
		{ key: 'blobs', value: '…', status: 'loading' },
		{ key: 'storage', value: '…', status: 'loading' },
		{ key: 'invite codes', value: '…', status: 'loading' },
	];

	let items: KVItem[] = $state([...LOADING_ITEMS]);
	let accountDetails: AccountDetail[] = $state([]);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
	}

	function buildItems(stats: Stats): KVItem[] {
		return [
			{ key: 'accounts', value: stats.accounts?.toString() ?? '—' },
			{ key: 'repos', value: stats.repos?.toString() ?? '—' },
			{ key: 'records', value: stats.records?.toLocaleString() ?? '—' },
			{ key: 'blobs', value: stats.blobs?.toLocaleString() ?? '—' },
			{ key: 'storage', value: stats.blobBytes != null ? formatBytes(stats.blobBytes) : '—' },
			{ key: 'invite codes', value: stats.inviteCodes?.toString() ?? '—' },
		];
	}

	onMount(async () => {
		try {
			const r = await fetch(`${baseUrl}/stats`);
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const stats: Stats = await r.json();
			items = buildItems(stats);
			accountDetails = stats.accountDetails ?? [];
		} catch {
			// leave loading placeholders
		}
	});
</script>

<KVGrid {items} />

{#if accountDetails.length > 0}
	<div class="pds-account-details">
		<h4>accounts</h4>
		<div class="pds-account-table">
			<div class="pds-account-header">
				<span>did</span>
				<span>records</span>
				<span>blobs</span>
				<span>storage</span>
			</div>
			{#each accountDetails as account (account.did)}
				<div class="pds-account-row">
					<span class="pds-account-did" title={account.did}>
						{account.did.length > 30 ? account.did.slice(0, 15) + '…' + account.did.slice(-14) : account.did}
					</span>
					<span>{account.records.toLocaleString()}</span>
					<span>{account.blobs.toLocaleString()}</span>
					<span>{account.blobBytesHuman}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.pds-account-details {
		margin-top: 1rem;
	}

	.pds-account-details h4 {
		color: var(--pds-color-green);
		opacity: 0.6;
		font-size: 0.75em;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 0.5rem;
	}

	.pds-account-table {
		font-size: 0.8em;
		overflow-x: auto;
	}

	.pds-account-header,
	.pds-account-row {
		display: grid;
		grid-template-columns: 1fr 80px 60px 80px;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	.pds-account-header {
		color: var(--pds-color-green);
		opacity: 0.4;
		font-size: 0.85em;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--pds-color-surface-1);
	}

	.pds-account-row {
		color: var(--pds-color-text);
		opacity: 0.8;
	}

	.pds-account-row:nth-child(even) {
		opacity: 0.6;
	}

	.pds-account-did {
		font-family: monospace;
		word-break: break-all;
	}

	@media (max-width: 440px) {
		.pds-account-header,
		.pds-account-row {
			grid-template-columns: 1fr;
			gap: 0;
		}

		.pds-account-header span:not(:first-child),
		.pds-account-row span:not(:first-child) {
			display: none;
		}
	}
</style>
