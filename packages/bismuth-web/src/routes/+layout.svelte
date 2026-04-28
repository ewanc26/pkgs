<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './layout.css';
	import logo from '$lib/assets/logo.svg';
	let { children } = $props();

	const webVersion: string = __WEB_VERSION__;
	const cliVersion: string = __CLI_VERSION__;
</script>

<svelte:head>
	<script defer src="https://analytics.ewancroft.uk/script.js" data-website-id="b9e23511-49d0-43b9-b58c-97eb91aa4cd3"></script>
</svelte:head>

<LandingLayout
	name="bismuth"
	logo={logo}
	logoAlt="Bismuth"
	footerTagline="your documents, your format"
	footerSourceUrl="https://github.com/ewanc26/pkgs"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
