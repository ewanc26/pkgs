<svelte:head>
	<title>croft.click</title>
</svelte:head>

<main>
	<section class="hero">
		<p class="eyebrow">croft.click</p>
		<h1>AT Protocol<br />tools.</h1>
		<p class="sub">Move your data to the open social web. Free, open-source, runs in your browser.</p>
	</section>

	<section class="projects">
		<a href="https://jasper.croft.click" class="project-card jasper" rel="noopener">
			<div class="card-header">
				<img src="/jasper.svg" alt="" class="card-logo" width={28} height={28} />
				<span class="card-eyebrow">JASPER</span>
			</div>
			<h2>Instagram → Grain &amp; Spark</h2>
			<p>Import your photos, stories, and videos from an Instagram data export. Original timestamps preserved, duplicates skipped.</p>
			<span class="card-link">jasper.croft.click →</span>
		</a>

		<a href="https://malachite.croft.click" class="project-card malachite" rel="noopener">
			<div class="card-header">
				<img src="/malachite.svg" alt="" class="card-logo" width={28} height={28} />
				<span class="card-eyebrow">MALACHITE</span>
			</div>
			<h2>Last.fm &amp; Spotify → Teal</h2>
			<p>Import your listening history from Last.fm scrobbles and Spotify plays. Smart deduplication and sync support.</p>
			<span class="card-link">malachite.croft.click →</span>
		</a>

		<a href="https://bismuth.croft.click" class="project-card bismuth" rel="noopener">
			<div class="card-header">
				<img src="/bismuth.svg" alt="" class="card-logo" width={28} height={28} />
				<span class="card-eyebrow">BISMUTH</span>
			</div>
			<h2>site.standard.document → Markdown</h2>
			<p>Convert ATProto richtext-block documents from Leaflet, Pckt, and Offprint to Markdown in your browser.</p>
			<span class="card-link">bismuth.croft.click →</span>
		</a>
	</section>

	<footer>
		<a href="https://github.com/ewanc26/pkgs" target="_blank" rel="noopener">↗ source</a>
		<span class="sep">·</span>
		<span>by Ewan Croft</span>
	</footer>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
		padding: 3rem 1.5rem 1.5rem;
	}

	/* ── hero ──────────────────────────────────────────────────────────────── */
	.hero {
		text-align: center;
		margin-bottom: 3rem;
	}

	.eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		letter-spacing: 0.15em;
		color: var(--muted);
		margin: 0 0 1rem;
	}

	h1 {
		font-size: 3rem;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.03em;
		margin: 0 0 1rem;
	}

	.sub {
		color: var(--muted);
		font-size: 1.05rem;
		max-width: 28rem;
		line-height: 1.5;
		margin: 0;
	}

	/* ── project cards ────────────────────────────────────────────────────── */
	.projects {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		width: 100%;
		max-width: 56rem;
		margin-bottom: 3rem;
	}

	.project-card {
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.75rem;
		text-decoration: none;
		color: var(--text);
		transition:
			border-color 0.2s,
			transform 0.15s;
	}

	.project-card:hover {
		transform: translateY(-2px);
	}

	.project-card.jasper:hover {
		border-color: #fb923c;
	}

	.project-card.malachite:hover {
		border-color: #3fb968;
	}

	.project-card.bismuth:hover {
		border-color: #c4b5fd;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.card-logo {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
	}

	.card-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		color: var(--muted);
	}

	h2 {
		font-size: 1.2rem;
		font-weight: 600;
		margin: 0 0 0.6rem;
		line-height: 1.3;
	}

	.project-card p {
		color: var(--muted);
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0 0 1.25rem;
		flex: 1;
	}

	.card-link {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: var(--muted);
		letter-spacing: 0.02em;
	}

	.project-card.jasper:hover .card-link {
		color: #fb923c;
	}

	.project-card.malachite:hover .card-link {
		color: #3fb968;
	}

	.project-card.bismuth:hover .card-link {
		color: #c4b5fd;
	}

	/* ── footer ───────────────────────────────────────────────────────────── */
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

	/* ── responsive ───────────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		h1 {
			font-size: 2.25rem;
		}

		.projects {
			grid-template-columns: 1fr;
		}
	}
</style>
