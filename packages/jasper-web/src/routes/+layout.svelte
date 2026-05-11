<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './layout.css';
	import logo from '$lib/assets/favicon.svg';
	let { children } = $props();

	const webVersion: string = __WEB_VERSION__;
	const cliVersion: string = __CLI_VERSION__;
</script>

<LandingLayout
	name="jasper"
	logo={logo}
	logoAlt="Jasper"
	subtitle="Instagram → Grain & Spark"
	footerTagline="your photos, your data"
	footerSourceUrl="https://github.com/ewanc26/pkgs/tree/main/packages/jasper"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
