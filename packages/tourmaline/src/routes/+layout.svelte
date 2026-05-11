<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';
	import './app.css';
	let { children } = $props();
</script>

<LandingLayout
	name="tourmaline"
	logo="/logo.svg"
	logoAlt="Tourmaline"
	subtitle="Teal.fm scrobble analyser"
	navLinks={[
		{ label: 'About', href: '/about' },
		{ label: 'GitHub', href: 'https://github.com/ewanc26/pkgs/tree/main/packages/tourmaline', external: true }
	]}
	footerTagline="privacy-first listening analysis"
	footerSourceUrl="https://github.com/ewanc26/pkgs/tree/main/packages/tourmaline"
>
	{@render children()}
</LandingLayout>
