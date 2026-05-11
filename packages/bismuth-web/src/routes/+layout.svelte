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
	name="bismuth"
	logo={logo}
	logoAlt="Bismuth"
	subtitle="ATProto docs → Markdown"
	footerTagline="your documents, your format"
	footerSourceUrl="https://github.com/ewanc26/pkgs"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
