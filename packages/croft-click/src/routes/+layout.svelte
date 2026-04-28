<script lang="ts">
	import './layout.css';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
	<script defer src="https://analytics.ewancroft.uk/script.js" data-website-id="f411f084-0b1b-4427-95fd-49cc4289d821"></script>
</svelte:head>

{@render children()}
