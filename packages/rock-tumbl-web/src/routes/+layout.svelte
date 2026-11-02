<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './layout.css';
	import logo from '$lib/assets/logo.svg';
	let { children } = $props();

	const webVersion: string = __WEB_VERSION__;
	const cliVersion: string = __CLI_VERSION__;
</script>

<LandingLayout
	name="rock-tumbl"
	logo={logo}
	logoAlt="rock-tumbl"
	subtitle="Tumblr → Standard.site"
	footerTagline="your posts, your publication"
	footerSourceUrl="https://github.com/ewanc26/pkgs/tree/main/packages/rock-tumbl"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
