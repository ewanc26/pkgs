<script lang="ts">
</script>

<svelte:head>
	<title>Jasper — Instagram → Grain Importer</title>
	<meta name="description" content="Import your Instagram photos to Grain.social while preserving original timestamps" />
</svelte:head>

<main>
	<div class="hero">
		<div class="hero-icon">📸</div>
		<h1>Jasper</h1>
		<p class="tagline">
			Import your Instagram photos to <a href="https://grain.social" target="_blank" rel="noopener">Grain.social</a>
			<br />
			<span class="muted">Preserving original timestamps</span>
		</p>
		<div class="cta">
			<a href="/import" class="btn primary">Import your photos</a>
			<a href="/about" class="btn secondary">Learn more</a>
		</div>
	</div>

	<div class="features">
		<div class="feature">
			<span class="feature-icon">📅</span>
			<h3>Original Dates</h3>
			<p>Your photos appear with their original Instagram dates, not the import date.</p>
		</div>
		<div class="feature">
			<span class="feature-icon">🔒</span>
			<h3>Privacy-First</h3>
			<p>Everything runs in your browser. Your photos go directly to your Grain account.</p>
		</div>
		<div class="feature">
			<span class="feature-icon">⚡</span>
			<h3>Smart Import</h3>
			<p>Handles all Instagram export formats. Detects and skips duplicates automatically.</p>
		</div>
	</div>
</main>

<style>
	.hero {
		text-align: center;
		padding: 3rem 0;
	}
	.hero-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}
	h1 {
		margin-bottom: 0.5rem;
		background: linear-gradient(135deg, var(--accent), #cba6f7);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.tagline {
		font-size: 1.2rem;
		color: var(--fg);
		margin-bottom: 2rem;
	}
	.muted {
		color: var(--muted);
	}
	.cta {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	.btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
	}
	.btn.primary {
		background: var(--accent);
		color: var(--bg);
	}
	.btn.primary:hover {
		background: var(--accent-hover);
	}
	.btn.secondary {
		background: var(--card);
		color: var(--fg);
		border: 1px solid var(--border);
	}
	.btn.secondary:hover {
		border-color: var(--accent);
	}
	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-top: 4rem;
	}
	.feature {
		text-align: center;
		padding: 1.5rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	.feature-icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 0.5rem;
	}
	.feature h3 {
		margin-bottom: 0.5rem;
		font-size: 1.1rem;
	}
	.feature p {
		font-size: 0.9rem;
		color: var(--muted);
		margin: 0;
	}
</style>
