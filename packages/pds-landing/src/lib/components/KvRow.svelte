<script lang="ts">
	import type { StatusClass } from '$lib/status.svelte.js';

	interface Props {
		key: string;
		text: string;
		cls?: StatusClass;
	}

	let { key, text, cls = '' }: Props = $props();
</script>

<span class="kv-key">{key}</span>
<span class="kv-val {cls}">{text}</span>
