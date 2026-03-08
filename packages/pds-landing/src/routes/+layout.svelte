<script lang="ts">
	import './layout.css';

	const { children } = $props();
</script>

<svelte:head>
	<title>pds.ewancroft.uk — Ewan's ATProto PDS</title>
	<meta name="description" content="Ewan's personal ATProto PDS — a self-hosted Bluesky-compatible server running at pds.ewancroft.uk." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pds.ewancroft.uk" />
	<meta property="og:title" content="pds.ewancroft.uk — Ewan's ATProto PDS" />
	<meta property="og:description" content="Ewan's personal ATProto PDS — a self-hosted Bluesky-compatible server running at pds.ewancroft.uk." />
	<meta property="og:image" content="https://pds.ewancroft.uk/thumb.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://pds.ewancroft.uk/thumb.svg" />
	<meta name="twitter:title" content="pds.ewancroft.uk — Ewan's ATProto PDS" />
	<meta name="twitter:description" content="Ewan's personal ATProto PDS — a self-hosted Bluesky-compatible server running at pds.ewancroft.uk." />
	<link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />
	<link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png" />
	<link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png" />
	<link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png" />
	<link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png" />
	<link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png" />
	<link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png" />
	<link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png" />
	<link rel="icon" type="image/png" sizes="256x256" href="/favicon-256x256.png" />
	<link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
	<link rel="shortcut icon" href="/favicon.ico" />
	<link rel="manifest" href="/manifest.json" />
	<meta name="msapplication-TileColor" content="#1a2420" />
	<meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
	<meta name="theme-color" content="#1a2420" />
</svelte:head>

{@render children()}
