<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './layout.css';
	let { children } = $props();

	const webVersion: string = __WEB_VERSION__;
	const cliVersion: string = __CLI_VERSION__;
</script>

<svelte:head>
	<script defer src="https://analytics.ewancroft.uk/script.js" data-website-id="9d262bc3-cbac-4c0b-b81a-7a93134f76df"></script>
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
