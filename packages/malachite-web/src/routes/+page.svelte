<script lang="ts">
	import { LandingPage } from '@ewanc26/landing-ui';
	import { Music2, Disc3, Layers2, RefreshCw, ListFilter } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Malachite — Import your music history to Teal</title>
	<meta
		name="description"
		content="Import your music history from Last.fm and Spotify into Teal. Own your listening data instead of leaving it behind on closed platforms."
	/>
	<link rel="canonical" href="https://malachite.croft.click" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://malachite.croft.click" />
	<meta property="og:title" content="Malachite — Import your music history to Teal" />
	<meta
		property="og:description"
		content="Import your music history from Last.fm and Spotify into Teal. Own your listening data instead of leaving it behind on closed platforms."
	/>
	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Malachite — Import your music history to Teal" />
	<meta
		name="twitter:description"
		content="Import your music history from Last.fm and Spotify into Teal. Own your listening data instead of leaving it behind on closed platforms."
	/>
</svelte:head>

<LandingPage
	name="malachite"
	logo="/logo/Malachite.svg"
	logoAlt="The Malachite sigil: a circular emblem of concentric teal and green rings forming a sacred circle, overlaid with a pale green pentagram binding five points, centred on a single dot representing the listener as witness"
	eyebrow="Open source · Runs in your browser"
	ctaHref="/import"
	ctaLabel="Start importing"
	ctaSub="No account needed. No data leaves your browser except to your own PDS."
	githubUrl="https://github.com/ewanc26/pkgs/tree/main/packages/malachite"
	features={[
		{ icon: Music2, title: 'Last.fm', description: 'Import your full scrobble history from a Last.fm CSV data export.' },
		{ icon: Disc3, title: 'Spotify', description: "Import extended streaming history from Spotify's JSON data export." },
		{ icon: Layers2, title: 'Combined', description: 'Merge both sources together with smart deduplication to avoid double-counting plays.' },
		{ icon: RefreshCw, title: 'Sync', description: 'Only import records not already in Teal — safe to re-run any time.' },
		{ icon: ListFilter, title: 'Deduplicate', description: 'Find and remove duplicate records already in your Teal account.' }
	]}
	steps={[
		{ title: 'Choose a mode', description: 'Pick Last.fm, Spotify, combined, sync, or deduplicate.' },
		{ title: 'Sign in with ATProto', description: 'Use your Bluesky handle and an app password. Nothing is stored.' },
		{ title: 'Upload your export', description: 'Drop in your CSV or JSON files — everything is processed locally in your browser.' },
		{ title: 'Import', description: 'Malachite publishes your records to your PDS with automatic rate-limit handling.' }
	]}
	siblings={[
		{ name: 'Opal', url: 'https://opal.croft.click', description: 'Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky.' },
		{ name: 'Jasper', url: 'https://jasper.croft.click', description: 'Import Instagram photos and videos to Grain or Spark.' },
		{ name: 'Bismuth', url: 'https://bismuth.croft.click', description: 'Convert ATProto richtext-block documents to Markdown.' },
		{ name: 'Tourmaline', url: 'https://tourmaline.croft.click', description: 'Analyse your Teal.fm scrobbles and discover your listener archetype.' }
	]}
>
	{#snippet heading()}
		Bring your listening history<br />back under your control.
	{/snippet}

	{#snippet sub()}
		Malachite imports your Last.fm scrobbles and Spotify plays into
		<a href="https://teal.fm" target="_blank" rel="noopener">Teal</a>
		— so your music data stays with you, not the streaming platforms.
	{/snippet}
</LandingPage>
