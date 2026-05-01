<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './layout.css';
	let { children } = $props();

	const webVersion: string = __WEB_VERSION__;
	const cliVersion: string = __CLI_VERSION__;
</script>

<svelte:head>
	<script defer src="https://analytics.ewancroft.uk/script.js" data-website-id="019d19bd-9801-4a78-8e0a-400373f31006"></script>
</svelte:head>

<LandingLayout
	name="opal"
	logo="/logo/Opal.svg"
	logoAlt="Opal"
	footerTagline="privacy-first analytics"
	footerSourceUrl="https://github.com/ewanc26/pkgs/tree/main/packages/opal"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
