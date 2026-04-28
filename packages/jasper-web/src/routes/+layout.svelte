<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './layout.css';
	import logo from '$lib/assets/favicon.svg';
	let { children } = $props();

	const webVersion: string = __WEB_VERSION__;
	const cliVersion: string = __CLI_VERSION__;
</script>

<svelte:head>
	<script defer src="https://analytics.ewancroft.uk/script.js" data-website-id="f26b9c6e-7a42-4036-88db-078984668731"></script>
</svelte:head>

<LandingLayout
	name="jasper"
	logo={logo}
	logoAlt="Jasper"
	footerTagline="your photos, your data"
	footerSourceUrl="https://github.com/ewanc26/pkgs"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
