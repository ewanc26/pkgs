<script lang="ts">
	import { LandingPage } from '@ewanc26/landing-ui';
	import { FileArchive, Newspaper, Images, Send, Lock } from '@lucide/svelte';
	import logo from '$lib/assets/logo.svg';
</script>

<svelte:head>
	<title>rock-tumbl — Tumblr exports to Standard.site</title>
	<meta
		name="description"
		content="Convert your Tumblr blog export into Standard.site documents. Publication creation, media upload, and AT Protocol publishing support."
	/>
	<link rel="canonical" href="https://rock-tumbl.croft.click" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://rock-tumbl.croft.click" />
	<meta property="og:title" content="rock-tumbl — Tumblr exports to Standard.site" />
	<meta
		property="og:description"
		content="Convert your Tumblr blog export into Standard.site documents. Publication creation, media upload, and AT Protocol publishing support."
	/>
	<meta property="og:image" content="https://rock-tumbl.croft.click/og.svg" />

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="rock-tumbl — Tumblr exports to Standard.site" />
	<meta
		name="twitter:description"
		content="Convert your Tumblr blog export into Standard.site documents. Publication creation, media upload, and AT Protocol publishing support."
	/>
	<meta name="twitter:image" content="https://rock-tumbl.croft.click/og.svg" />
</svelte:head>

<LandingPage
	name="rock-tumbl"
	logo={logo}
	logoAlt="rock-tumbl"
	eyebrow="Open source · Free to use"
	ctaHref="/convert"
	ctaLabel="Open converter"
	ctaSub="Upload your export — files are converted on the server and deleted afterwards."
	githubUrl="https://github.com/ewanc26/pkgs/tree/main/packages/rock-tumbl"
	features={[
		{ icon: FileArchive, title: 'Tumblr exports', description: 'Drop in the ZIP from Tumblr — nested posts.zip archives are descended into automatically.' },
		{ icon: Newspaper, title: 'Standard.site documents', description: 'Text, photo, quote, chat, audio, video, and ask posts become site.standard.document records.' },
		{ icon: Images, title: 'Media upload', description: 'Referenced images and media can be uploaded to your PDS with links rewritten.' },
		{ icon: Send, title: 'AT Protocol publishing', description: 'Create the publication record and publish documents straight to Standard.site.' },
		{ icon: Lock, title: 'Private posts stay private', description: 'Private and draft posts are excluded by default — include them only if you ask.' }
	]}
	steps={[
		{ title: 'Export from Tumblr', description: 'Download your blog export as a ZIP from Tumblr.' },
		{ title: 'Upload your export', description: 'Drop in the ZIP and add your publication URL or AT URI.' },
		{ title: 'Convert', description: 'rock-tumbl parses your posts and builds Standard.site documents.' },
		{ title: 'Download or publish', description: 'Download the documents as JSON, or publish them to your PDS.' }
	]}
	siblings={[
		{ name: 'Malachite', url: 'https://malachite.croft.click', description: 'Import your music listening history into Teal.' },
		{ name: 'Opal', url: 'https://opal.croft.click', description: 'Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky.' },
		{ name: 'Bismuth', url: 'https://bismuth.croft.click', description: 'Convert ATProto richtext-block documents to Markdown.' },
		{ name: 'Jasper', url: 'https://jasper.croft.click', description: 'Import Instagram photos and videos to Grain or Spark.' }
	]}
>
	{#snippet heading()}
		Take your Tumblr posts<br />out of the platform.
	{/snippet}

	{#snippet sub()}
		rock-tumbl converts your Tumblr export into
		<a href="https://standard.site" target="_blank" rel="noopener">Standard.site</a>
		documents — own your archive instead of leaving it locked in by big tech.
	{/snippet}
</LandingPage>
