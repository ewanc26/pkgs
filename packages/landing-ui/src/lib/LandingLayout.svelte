<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ExternalLink } from '@lucide/svelte';

	interface Props {
		name: string;
		logo: string;
		logoAlt?: string;
		subtitle?: string;
		footerTagline: string;
		footerSourceUrl: string;
		footerAboutUrl?: string;
		webVersion: string;
		cliVersion: string;
		children: Snippet;
	}

	let {
		name,
		logo,
		logoAlt = name,
		subtitle,
		footerTagline,
		footerSourceUrl,
		footerAboutUrl = '/about',
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
	<div class="version-strip">
		<span>web v{webVersion}</span>
		<span class="sep">–</span>
		<span>cli v{cliVersion}</span>
	</div>
</header>

{@render children()}

<footer>
	<div class="footer-row">
		<span class="footer-name">{name}</span>
		<span class="sep">·</span>
		<span>{footerTagline}</span>
		<span class="sep">·</span>
		<a href={footerSourceUrl} target="_blank" rel="noopener" class="inline-flex items-center gap-1">
			Source <ExternalLink size={10} />
		</a>
		<span class="sep">·</span>
		<a href={footerAboutUrl}>Privacy</a>
	</div>
	<span class="footer-copyright">© {year} Ewan Croft · AGPL-3.0</span>
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
		background: var(--bg);
		border-bottom: 1px solid var(--border);
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
	.footer-copyright {
		font-size: 0.65rem;
		color: var(--muted);
		opacity: 0.7;
	}
</style>
