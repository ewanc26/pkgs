<script lang="ts">
	import { LandingPage } from '@ewanc26/landing-ui';
	import { Calendar, Lock, Zap } from '@lucide/svelte';
	import logo from '$lib/assets/favicon.svg';
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
		{ icon: Zap, title: 'Smart Import', description: 'Handles all Instagram export formats. Detects and skips duplicates automatically.' }
	]}
	steps={[
		{ title: 'Export from Instagram', description: 'Download your data from Instagram as a ZIP file with JSON format.' },
		{ title: 'Sign in with ATProto', description: 'Use OAuth to securely connect your AT Protocol account. Nothing is stored.' },
		{ title: 'Upload your export', description: 'Drop in your ZIP file — everything is processed locally in your browser.' },
		{ title: 'Import', description: 'Jasper uploads your photos to Grain or Spark with their original timestamps preserved.' }
	]}
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
