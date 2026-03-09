<script lang="ts">
	import KofiSupporters from '$lib/KofiSupporters.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<KofiSupporters supporters={data.supporters} heading="All Supporters" />
