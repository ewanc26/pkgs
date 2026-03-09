<script lang="ts">
	/**
	 * Convenience wrapper around KofiSupporters pre-filtered to Subscription
	 * events, with the "Lunar Contributors" heading.
	 *
	 * Equivalent to:
	 *   <KofiSupporters filter={['Subscription']} heading="Lunar Contributors" />
	 */
	import KofiSupporters from './KofiSupporters.svelte';
	import type { KofiSupportersProps } from './types.js';

	let {
		supporters = [],
		heading = 'Lunar Contributors',
		description = 'People who support my work on Ko-fi.',
		loading = false,
		error = null
	}: Omit<KofiSupportersProps, 'filter'> = $props();
</script>

<KofiSupporters
	{supporters}
	{heading}
	{description}
	filter={['Subscription']}
	{loading}
	{error}
/>
