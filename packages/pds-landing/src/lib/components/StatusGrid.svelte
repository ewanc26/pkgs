<script lang="ts">
	import { onMount } from 'svelte';
	import KVGrid from './KVGrid.svelte';
	import type { KVItem } from './KVGrid.svelte';
	import { fetchPDSStatus, type PDSHealth, type PDSDescription } from '../utils/fetchPDSStatus.js';

	interface Props {
		/**
		 * Base URL to prepend to `/xrpc/…` calls.
		 * Defaults to `''` (same origin — correct for in-browser use).
		 */
		baseUrl?: string;
	}

	let { baseUrl = '' }: Props = $props();

	const LOADING_ITEMS: KVItem[] = [
		{ key: 'reachable', value: '…', status: 'loading' },
		{ key: 'version', value: '…', status: 'loading' },
		{ key: 'did', value: '…', status: 'loading' },
		{ key: 'accounts', value: '…', status: 'loading' },
		{ key: 'invite required', value: '…', status: 'loading' }
	];

	let items: KVItem[] = $state([...LOADING_ITEMS]);

	function buildItems(
		health: PDSHealth,
		description: PDSDescription,
		accountCount: number
	): KVItem[] {
		const result: KVItem[] = [
			{
				key: 'reachable',
				value: health.reachable ? '✓ online' : '✗ unreachable',
				status: health.reachable ? 'ok' : 'err'
			},
			{
				key: 'version',
				value: health.version ?? (health.reachable ? 'unknown' : '—'),
				status: health.reachable ? undefined : 'err'
			},
			{
				key: 'did',
				value: description.did ?? '—'
			},
			{
				key: 'accounts',
				value: accountCount >= 0 ? accountCount.toString() : '—'
			},
			{
				key: 'invite required',
				value:
					description.inviteCodeRequired === null
						? '—'
						: description.inviteCodeRequired
							? 'yes'
							: 'no',
				status:
					description.inviteCodeRequired === null
						? undefined
						: description.inviteCodeRequired
							? 'warn'
							: 'ok'
			}
		];

		if (description.phoneVerificationRequired !== null) {
			result.push({
				key: 'phone verify',
				value: description.phoneVerificationRequired ? 'yes' : 'no',
				status: description.phoneVerificationRequired ? 'warn' : 'ok'
			});
		}

		if (description.availableUserDomains.length > 0) {
			result.push({
				key: 'user domains',
				value: description.availableUserDomains.join(', ')
			});
		}

		return result;
	}

	onMount(async () => {
		const { health, description, accountCount } = await fetchPDSStatus(baseUrl);
		items = buildItems(health, description, accountCount);
	});
</script>

<KVGrid {items} />
