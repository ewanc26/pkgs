<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ExternalLink, Heart } from '@lucide/svelte';

	interface NavLink {
		label: string;
		href: string;
		external?: boolean;
	}

	interface Props {
		name: string;
		logo: string;
		logoAlt?: string;
		subtitle?: string;
		navLinks?: NavLink[];
		footerTagline: string;
		footerSourceUrl: string;
		footerAboutUrl?: string;
		/** Support hub link. Set to '' to hide the support links entirely. */
		supportUrl?: string;
		/** Directory of sibling tools. Set to '' to hide. */
		directoryUrl?: string;
		/** Show the AT Protocol trademark attribution. */
		showAtprotoNotice?: boolean;
		webVersion?: string;
		cliVersion?: string;
		children: Snippet;
	}

	let {
		name,
		logo,
		logoAlt = name,
		subtitle,
		navLinks = [],
		footerTagline,
		footerSourceUrl,
		footerAboutUrl = '/about',
		supportUrl = 'https://ewancroft.uk/support',
		directoryUrl = 'https://croft.click',
		showAtprotoNotice = true,
		webVersion,
		cliVersion,
		children
	}: Props = $props();

	const year = new Date().getFullYear();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<header>
	<a href="/" class="brand">
		<span class="logo-mark"><img src={logo} alt={logoAlt} width={22} height={22} /></span>
		<div class="brand-text">
			<span class="wordmark">{name}</span>
			{#if subtitle}
				<span class="subtitle">{subtitle}</span>
			{/if}
		</div>
	</a>
	<div class="header-right">
		{#if navLinks.length}
			<nav class="nav-links">
				{#each navLinks as link}
					{#if link.external}
						<a href={link.href} target="_blank" rel="noopener" class="inline-flex items-center gap-1">
							{link.label} <ExternalLink size={11} />
						</a>
					{:else}
						<a href={link.href}>{link.label}</a>
					{/if}
				{/each}
			</nav>
		{/if}
		{#if supportUrl}
			<a href={supportUrl} target="_blank" rel="noopener" class="support-link" aria-label="Support">
				<Heart size={12} /> <span class="support-label">Support</span>
			</a>
		{/if}
		{#if webVersion && cliVersion}
			<div class="version-strip">
				<span>web v{webVersion}</span>
				<span class="sep">--</span>
				<span>cli v{cliVersion}</span>
			</div>
		{/if}
	</div>
</header>

{@render children()}

<footer>
	<div class="footer-row">
		<span class="footer-name">{name}</span>
		<span class="sep">|</span>
		<span>{footerTagline}</span>
		<span class="sep">|</span>
		<a href={footerSourceUrl} target="_blank" rel="noopener" class="inline-flex items-center gap-1">
			Source <ExternalLink size={10} />
		</a>
		<span class="sep">|</span>
		<a href={footerAboutUrl}>Privacy</a>
		{#if directoryUrl}
			<span class="sep">|</span>
			<a href={directoryUrl} target="_blank" rel="noopener">More tools</a>
		{/if}
		{#if supportUrl}
			<span class="sep">|</span>
			<a href={supportUrl} target="_blank" rel="noopener" class="footer-support">
				<Heart size={10} /> Support
			</a>
		{/if}
	</div>
	{#if supportUrl}
		<span class="footer-note">Free and open source — kept going by people who chip in.</span>
	{/if}
	<span class="footer-copyright">(c) {year} Ewan Croft | AGPL-3.0</span>
	{#if showAtprotoNotice}
		<span class="footer-trademark">
			“AT Protocol” and “atproto” are trademarks of Bluesky Social PBC. {name} is an
			independent project, not affiliated with or endorsed by Bluesky Social PBC. See the
			<a
				href="https://atproto.com/about/trademarks/atproto-trademark-policy"
				target="_blank"
				rel="noopener">trademark policy</a
			>.
		</span>
	{/if}
</footer>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 1.5rem;
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: blur(10px) saturate(140%);
		-webkit-backdrop-filter: blur(10px) saturate(140%);
		border-bottom: 1px solid var(--border);
		box-shadow: 0 8px 24px -16px rgba(0, 0, 0, 0.4);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		transition: color 0.15s;
	}
	.brand:hover {
		color: var(--text);
	}
	.logo-mark {
		color: var(--accent);
		flex-shrink: 0;
	}
	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}
	.wordmark {
		font-size: 0.85rem;
		font-weight: 600;
		font-family: 'JetBrains Mono', monospace;
		color: var(--accent);
		letter-spacing: -0.02em;
	}
	.subtitle {
		font-size: 0.6rem;
		color: var(--muted);
		display: none;
	}
	@media (min-width: 640px) {
		.subtitle {
			display: block;
		}
	}
	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--muted);
	}
	.nav-links a {
		color: var(--muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.nav-links a:hover {
		color: var(--accent);
	}
	.support-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: var(--muted);
		text-decoration: none;
		padding: 0.25rem 0.55rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		transition:
			color 0.15s,
			border-color 0.15s;
	}
	.support-link:hover {
		color: var(--accent);
		border-color: var(--accent);
	}
	.support-label {
		display: none;
	}
	@media (min-width: 480px) {
		.support-label {
			display: inline;
		}
	}
	.version-strip {
		font-size: 0.7rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--muted);
		letter-spacing: 0.03em;
		user-select: none;
	}
	.sep {
		margin: 0 0.4rem;
		color: var(--muted);
	}
	footer {
		text-align: center;
		padding: 1rem 1.5rem;
		font-size: 0.7rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--muted);
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.footer-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0;
	}
	.footer-name {
		color: var(--text);
	}
	footer a {
		color: var(--muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	footer a:hover {
		color: var(--accent);
	}
	.footer-support {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.footer-note {
		font-size: 0.65rem;
		color: var(--muted);
		opacity: 0.75;
	}
	.footer-copyright {
		font-size: 0.65rem;
		color: var(--muted);
		opacity: 0.7;
	}
	.footer-trademark {
		max-width: 60ch;
		margin: 0.35rem auto 0;
		font-size: 0.62rem;
		line-height: 1.5;
		color: var(--muted);
		opacity: 0.55;
	}
	.footer-trademark a {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
