<script lang="ts">
	import { LandingPage } from '@ewanc26/landing-ui';
	import { Twitter, MessageCircle, AtSign, Zap, ArrowRightLeft, Shield } from '@lucide/svelte';
	import bluesky from '$lib/assets/bluesky.svg';
</script>

<svelte:head>
	<title>Opal — Convert your microblog posts to Bluesky</title>
	<meta
		name="description"
		content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Free, open-source, runs in your browser."
	/>
	<link rel="canonical" href="https://opal.croft.click" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://opal.croft.click" />
	<meta property="og:title" content="Opal — Convert your microblog posts to Bluesky" />
	<meta
		property="og:description"
		content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Free, open-source, runs in your browser."
	/>
	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Opal — Convert your microblog posts to Bluesky" />
	<meta
		name="twitter:description"
		content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Free, open-source, runs in your browser."
	/>
</svelte:head>

<LandingPage
	name="opal"
	logo="/logo/Opal.svg"
	logoAlt="The Opal sigil: a pentagram with opalescent play-of-colour fire"
	eyebrow="Open source · Runs in your browser"
	ctaHref="/import"
	ctaLabel="Start converting"
	ctaSub="No account needed. No data leaves your browser except to your own PDS."
	githubUrl="https://github.com/ewanc26/pkgs/tree/main/packages/opal"
	features={[
		{ icon: Twitter, title: 'Twitter/X', description: "Import your tweet archive from Twitter's data export file." },
		{ icon: MessageCircle, title: 'Mastodon', description: 'Convert your ActivityPub outbox or CSV export from any Mastodon instance.' },
		{ icon: AtSign, title: 'Threads', description: "Bring over your Threads posts from Meta's data export." },
		{ icon: Zap, title: 'Nostr', description: 'Convert your Nostr text notes (kind 1 events) to Bluesky posts.' },
		{ icon: ArrowRightLeft, title: 'Facets', description: 'Links, mentions, and hashtags are converted to ATProto facets where possible.' },
		{ icon: bluesky, title: 'Bluesky', description: 'Publish imported posts to ATProto Bluesky with full facet support.' },
		{ icon: Shield, title: 'Private', description: 'Everything runs in your browser. No data is sent anywhere except your own PDS.' }
	]}
	steps={[
		{ title: 'Choose a platform', description: 'Pick Twitter, Mastodon, Threads, or Nostr.' },
		{ title: 'Sign in with ATProto', description: 'Use your Bluesky handle and an app password. Nothing is stored.' },
		{ title: 'Upload your export', description: 'Drop in your archive file — everything is processed locally in your browser.' },
		{ title: 'Import', description: 'Opal publishes your posts to your PDS with automatic rate-limit handling.' }
	]}
	siblings={[
		{ name: 'Malachite', url: 'https://malachite.croft.click', description: 'Import Last.fm and Spotify listening history into Teal.' },
		{ name: 'Jasper', url: 'https://jasper.croft.click', description: 'Import Instagram photos and videos to Grain or Spark.' },
		{ name: 'Bismuth', url: 'https://bismuth.croft.click', description: 'Convert ATProto richtext-block documents to Markdown.' },
		{ name: 'Tourmaline', url: 'https://tourmaline.croft.click', description: 'Analyse your Teal.fm scrobbles and discover your listener archetype.' }
	]}
>
	{#snippet heading()}
		Bring your microblog posts<br />to the open web.
	{/snippet}

	{#snippet sub()}
		Opal converts your posts from Twitter, Mastodon, Threads, and Nostr into
		<a href="https://bsky.social" target="_blank" rel="noopener">Bluesky</a>
		posts — so your words stay with you, not the platforms.
	{/snippet}
</LandingPage>
