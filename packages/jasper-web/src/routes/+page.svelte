<script lang="ts">
	import { LandingPage } from '@ewanc26/landing-ui';
	import { Calendar, Lock, Zap } from '@lucide/svelte';
	import logo from '$lib/assets/favicon.svg';
	import grain from '$lib/assets/grain.svg';
	import spark from '$lib/assets/spark.svg';
</script>

<svelte:head>
	<title>Jasper — Import Instagram photos, stories, and videos to AT Protocol</title>
	<meta
		name="description"
		content="Import your Instagram photos, stories, and videos directly into Grain or Spark from your browser. Keep your memories under your control, not locked in by big tech."
	/>
	<link rel="canonical" href="https://jasper.croft.click" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://jasper.croft.click" />
	<meta property="og:title" content="Jasper — Import Instagram photos, stories, and videos to AT Protocol" />
	<meta
		property="og:description"
		content="Import your Instagram photos, stories, and videos directly into Grain or Spark from your browser. Keep your memories under your control, not locked in by big tech."
	/>

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Jasper — Import Instagram photos, stories, and videos to AT Protocol" />
	<meta
		name="twitter:description"
		content="Import your Instagram photos, stories, and videos directly into Grain or Spark from your browser. Keep your memories under your control, not locked in by big tech."
	/>
</svelte:head>

<LandingPage
	name="jasper"
	logo={logo}
	logoAlt="Jasper"
	eyebrow="Open source · Runs in your browser"
	ctaHref="/import"
	ctaLabel="Start importing"
	ctaSub="No account needed. No data leaves your browser except to your own PDS."
	githubUrl="https://github.com/ewanc26/pkgs/tree/main/packages/jasper"
	features={[
		{ icon: Calendar, title: 'Original Dates', description: 'Photos appear with their original Instagram timestamps, not the import date.' },
		{ icon: Lock, title: 'Privacy-First', description: 'Everything runs in your browser. Your photos go directly to your AT Protocol account.' },
		{ icon: grain, title: 'Grain', description: 'Import your export into Grain on ATProto with photo and story metadata preserved.' },
		{ icon: spark, title: 'Spark', description: 'Send your Instagram photos, stories, and videos to Spark with the right media metadata.' },
		{ icon: Zap, title: 'Smart Import', description: 'Handles all Instagram export formats. Detects and skips duplicates automatically.' }
	]}
	steps={[\n		{ title: 'Export from Instagram', description: 'Download your data from Instagram as a ZIP file with JSON format.' },\n		{ title: 'Sign in with ATProto', description: 'Use OAuth to securely connect your AT Protocol account. Nothing is stored.' },\n		{ title: 'Upload your export', description: 'Drop in your ZIP file — everything is processed locally in your browser.' },\n		{ title: 'Import', description: 'Jasper uploads your photos to Grain or Spark with their original timestamps preserved.' }\n	]}
	siblings={[\n		{ name: 'Malachite', url: 'https://malachite.croft.click', description: 'Import Last.fm and Spotify listening history into Teal.' },\n		{ name: 'Opal', url: 'https://opal.croft.click', description: 'Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky.' },\n		{ name: 'Bismuth', url: 'https://bismuth.croft.click', description: 'Convert ATProto richtext-block documents to Markdown.' },\n		{ name: 'Tourmaline', url: 'https://tourmaline.croft.click', description: 'Analyse your Teal.fm scrobbles and discover your listener archetype.' }\n	]}
>
	{#snippet heading()}
		Take your Instagram photos<br />out of the platform.
	{/snippet}

	{#snippet sub()}
		Jasper moves your Instagram export straight into
		<a href="https://grain.social" target="_blank" rel="noopener">Grain</a> or
		<a href="https://sprk.so" target="_blank" rel="noopener">Spark</a>
		— no corporate middleman, no extra tracking.
	{/snippet}
</LandingPage>
