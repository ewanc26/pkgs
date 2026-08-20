<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
</script>

<footer>
	<div class="footer-row">
		<a href="https://github.com/ewanc26/pkgs" target="_blank" rel="noopener" class="inline-flex items-center gap-1"><ExternalLink size={12} aria-hidden="true" /> source</a>
		<span class="sep" aria-hidden="true">·</span>
		<a href="https://ewancroft.uk/support" target="_blank" rel="noopener">support</a>
		<span class="sep" aria-hidden="true">·</span>
		<span>by Ewan Croft</span>
	</div>
	<p class="trademark">
		“AT Protocol” and “atproto” are trademarks of Bluesky Social PBC. croft.click is an
		independent project, not affiliated with or endorsed by Bluesky Social PBC. See the
		<a href="https://atproto.com/about/trademarks/atproto-trademark-policy" target="_blank" rel="noopener">trademark policy</a>.
	</p>
</footer>

<style>
	footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--muted);
	}

	.footer-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.trademark {
		max-width: 60ch;
		margin: 0;
		text-align: center;
		font-size: 0.62rem;
		line-height: 1.5;
		opacity: 0.55;
	}

	.trademark a {
		text-decoration: underline;
		text-underline-offset: 2px;
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
