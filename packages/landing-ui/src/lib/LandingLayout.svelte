<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		logo: string;
		logoAlt?: string;
		footerTagline: string;
		footerSourceUrl: string;
		webVersion: string;
		cliVersion: string;
		children: Snippet;
	}

	let {
		name,
		logo,
		logoAlt = name,
		footerTagline,
		footerSourceUrl,
		webVersion,
		cliVersion,
		children
	}: Props = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<header>
	<a href="/" class="brand">
		<span class="logo-mark"><img src={logo} alt={logoAlt} width={22} height={22} /></span>
		<span class="wordmark">{name}</span>
	</a>
	<div class="version-strip">
		<span>web v{webVersion}</span>
		<span class="sep">–</span>
		<span>cli v{cliVersion}</span>
	</div>
</header>

{@render children()}

<footer>
	<span>{footerTagline}</span>
	<span class="sep">·</span>
	<a href={footerSourceUrl} target="_blank" rel="noopener">source</a>
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
		gap: 0.45rem;
		text-decoration: none;
	}
	.logo-mark {
		color: var(--accent);
	}
	.wordmark {
		font-size: 0.85rem;
		font-weight: 600;
		font-family: 'JetBrains Mono', monospace;
		color: var(--accent);
		letter-spacing: -0.02em;
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
	}
	footer a {
		color: var(--accent);
		text-decoration: none;
	}
	footer a:hover {
		text-decoration: underline;
	}
</style>
