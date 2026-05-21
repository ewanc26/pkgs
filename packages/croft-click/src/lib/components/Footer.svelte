<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
</script>

<footer>
	<a href="https://github.com/ewanc26/pkgs" target="_blank" rel="noopener" class="inline-flex items-center gap-1"><ExternalLink size={12} aria-hidden="true" /> source</a>
	<span class="sep" aria-hidden="true">·</span>
	<a href="https://ewancroft.uk/support" target="_blank" rel="noopener">support</a>
	<span class="sep" aria-hidden="true">·</span>
	<span>by Ewan Croft</span>
</footer>

<style>
	footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--muted);
	}

	footer a {
		color: var(--muted);
		text-decoration: none;
		transition: color 0.15s;
	}

	footer a:hover {
		color: var(--text);
	}

	.sep {
		color: var(--border);
	}
</style>
