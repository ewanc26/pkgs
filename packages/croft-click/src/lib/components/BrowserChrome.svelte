<script lang="ts">
	let { url, accent }: { url: string; accent: string } = $props();
</script>

<div class="browser-chrome">
	<div class="chrome-dots">
		<span class="dot dot-red"></span>
		<span class="dot dot-yellow"></span>
		<span class="dot dot-green"></span>
	</div>
	<span class="chrome-url" style="color: {accent}">{url}</span>
</div>

<style>
	.browser-chrome {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.75rem;
		background: var(--surface-2);
		border-bottom: 1px solid var(--border);
	}

	.chrome-dots {
		display: flex;
		gap: 0.35rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.dot-red {
		background: #f87171;
	}

	.dot-yellow {
		background: #fbbf24;
	}

	.dot-green {
		background: #4ade80;
	}

	.chrome-url {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.02em;
	}
</style>
