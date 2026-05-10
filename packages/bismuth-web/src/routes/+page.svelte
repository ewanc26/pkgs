<script lang="ts">
	import { LandingPage } from '@ewanc26/landing-ui';
	import { FileText } from '@lucide/svelte';
	import logo from '$lib/assets/logo.svg';
</script>

<svelte:head>
	<title>Bismuth — ATProto richtext-block to Markdown</title>
</svelte:head>

<LandingPage
	name="bismuth"
	logo={logo}
	logoAlt="Bismuth"
	eyebrow="Open source · Runs in your browser"
	ctaHref="/convert"
	ctaLabel="Open converter"
	ctaSub="No sign-in needed. No data leaves your browser."
	githubUrl="https://github.com/ewanc26/pkgs/tree/main/packages/bismuth"
	features={[
		{ icon: FileText, title: 'Leaflet', description: 'Convert pub.leaflet.content and site.standard.document records with full block support.' },
		{ icon: FileText, title: 'Pckt', description: 'Handle blog.pckt.content with inline and blob-mode content resolution.' },
		{ icon: FileText, title: 'Offprint', description: 'Support app.offprint.content including task lists, web embeds, and coloured highlights.' }
	]}
	steps={[
		{ title: 'Paste or upload', description: 'Paste your ATProto document JSON or upload a .json file.' },
		{ title: 'Convert', description: 'Bismuth detects the content type and converts it to Markdown — all in your browser.' },
		{ title: 'Copy or download', description: 'Copy the Markdown to your clipboard or download it as a .md file.' }
	]}
	siblings={[
		{ name: 'Malachite', url: 'https://malachite.croft.click', description: 'Import Last.fm and Spotify listening history into Teal.' },
		{ name: 'Opal', url: 'https://opal.croft.click', description: 'Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky.' },
		{ name: 'Jasper', url: 'https://jasper.croft.click', description: 'Import Instagram photos and videos to Grain or Spark.' },
		{ name: 'Tourmaline', url: 'https://tourmaline.croft.click', description: 'Analyse your Teal.fm scrobbles and discover your listener archetype.' }
	]}
>
	{#snippet heading()}
		Convert ATProto documents<br />to Markdown.
	{/snippet}

	{#snippet sub()}
		Bismuth converts richtext-block documents from
		<a href="https://standard.site" target="_blank" rel="noopener">Standard.site</a> publications
		— Leaflet, Pckt, and Offprint — into clean Markdown.
	{/snippet}
</LandingPage>
