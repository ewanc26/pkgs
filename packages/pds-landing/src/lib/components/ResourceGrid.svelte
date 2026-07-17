<script lang="ts">
	import { onMount } from 'svelte';
	import KVGrid from './KVGrid.svelte';
	import type { KVItem } from './KVGrid.svelte';

	interface Stats {
		accounts?: number;
		activeAccounts?: number;
		repos?: number;
		inviteCodes?: number;
		blobs?: number;
		blobBytes?: number;
	}

	interface Props {
		/** Base URL to prepend to `/stats` calls. Defaults to '' (same origin). */
		baseUrl?: string;
	}

	let { baseUrl = '' }: Props = $props();

	const LOADING_ITEMS: KVItem[] = [
		{ key: 'repos', value: '…', status: 'loading' },
		{ key: 'blobs', value: '…', status: 'loading' },
		{ key: 'storage', value: '…', status: 'loading' },
		{ key: 'invite codes', value: '…', status: 'loading' },
	];

	let items: KVItem[] = $state([...LOADING_ITEMS]);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
	}

	function buildItems(stats: Stats): KVItem[] {
		return [
			{ key: 'repos', value: stats.repos?.toString() ?? '—' },
			{ key: 'blobs', value: stats.blobs?.toString() ?? '—' },
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
		} catch {
			// leave loading placeholders
		}
	});
</script>

<KVGrid {items} />
