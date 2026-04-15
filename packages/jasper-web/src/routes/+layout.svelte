<script lang="ts">
	import './layout.css';
	import { Image } from '@lucide/svelte';
	let { children } = $props();
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
		<Image class="logo-mark" size={22} />
		<span class="wordmark">jasper</span>
	</a>
	<nav>
		<a href="/about">About</a>
		<a href="https://docs.ewancroft.uk/projects/jasper" target="_blank" rel="noopener">Docs</a>
	</nav>
</header>

{@render children()}

<footer>
	<span>Made by Ewan Croft</span>
	<span class="sep">·</span>
	<a href="https://github.com/ewanc26/pkgs" target="_blank" rel="noopener">Source</a>
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
	nav {
		display: flex;
		gap: 1rem;
		font-size: 0.8rem;
	}
	nav a {
		color: var(--muted);
		text-decoration: none;
	}
	nav a:hover {
		color: var(--accent);
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
