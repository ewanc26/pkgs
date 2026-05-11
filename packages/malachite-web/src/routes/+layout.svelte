<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './layout.css';
	let { children } = $props();

	const webVersion: string = __WEB_VERSION__;
	const cliVersion: string = __CLI_VERSION__;
</script>

<LandingLayout
	name="malachite"
	logo="/logo/Malachite.svg"
	logoAlt="Malachite"
	subtitle="Last.fm & Spotify → Teal"
	footerTagline="privacy-first analytics"
	footerSourceUrl="https://github.com/ewanc26/pkgs/tree/main/packages/malachite"
	{webVersion}
	{cliVersion}
>
	{@render children()}
</LandingLayout>
