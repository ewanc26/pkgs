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
	name="malachite"
	logo="/logo/Malachite.svg"
	logoAlt="Malachite"
	footerTagline="privacy-first analytics"
	footerSourceUrl="https://github.com/ewanc26/malachite"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
