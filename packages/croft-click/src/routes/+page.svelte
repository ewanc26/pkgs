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
		<div class="project-card jasper">
			<div class="card-preview">
				<div class="browser-chrome">
					<div class="chrome-dots">
						<span class="dot dot-red"></span>
						<span class="dot dot-yellow"></span>
						<span class="dot dot-green"></span>
					</div>
					<span class="chrome-url">jasper.croft.click</span>
				</div>
				<div class="preview-viewport">
					<img src="/jasper.svg" alt="The Jasper logo" class="preview-logo" />
				</div>
			</div>
			<div class="card-body">
				<a href="https://jasper.croft.click" class="card-header" rel="noopener">
					<img src="/jasper.svg" alt="The Jasper logo" class="card-logo" width={28} height={28} />
					<span class="card-eyebrow">JASPER</span>
				</a>
				<h2>Instagram → Grain &amp; Spark</h2>
				<p>Import your photos, stories, and videos from an Instagram data export. Original timestamps preserved, duplicates skipped.</p>
				<a href="https://jasper.croft.click" class="card-link" rel="noopener">jasper.croft.click →</a>
			</div>
		</div>

		<div class="project-card malachite">
			<div class="card-preview">
				<div class="browser-chrome">
					<div class="chrome-dots">
						<span class="dot dot-red"></span>
						<span class="dot dot-yellow"></span>
						<span class="dot dot-green"></span>
					</div>
					<span class="chrome-url">malachite.croft.click</span>
				</div>
				<div class="preview-viewport">
					<img src="/malachite.svg" alt="The Malachite logo" class="preview-logo" />
				</div>
			</div>
			<div class="card-body">
				<a href="https://malachite.croft.click" class="card-header" rel="noopener">
					<img src="/malachite.svg" alt="The Malachite logo" class="card-logo" width={28} height={28} />
					<span class="card-eyebrow">MALACHITE</span>
				</a>
				<h2>Last.fm &amp; Spotify → Teal</h2>
				<p>Import your listening history from Last.fm scrobbles and Spotify plays. Smart deduplication and sync support.</p>
				<a href="https://malachite.croft.click" class="card-link" rel="noopener">malachite.croft.click →</a>
			</div>
		</div>

		<div class="project-card bismuth">
			<div class="card-preview">
				<div class="browser-chrome">
					<div class="chrome-dots">
						<span class="dot dot-red"></span>
						<span class="dot dot-yellow"></span>
						<span class="dot dot-green"></span>
					</div>
					<span class="chrome-url">bismuth.croft.click</span>
				</div>
				<div class="preview-viewport">
					<img src="/bismuth.svg" alt="The Bismuth logo" class="preview-logo" />
				</div>
			</div>
			<div class="card-body">
				<a href="https://bismuth.croft.click" class="card-header" rel="noopener">
					<img src="/bismuth.svg" alt="The Bismuth logo" class="card-logo" width={28} height={28} />
					<span class="card-eyebrow">BISMUTH</span>
				</a>
				<h2>site.standard.document → Markdown</h2>
				<p>Convert ATProto richtext-block documents from Leaflet, Pckt, and Offprint to Markdown in your browser.</p>
				<a href="https://bismuth.croft.click" class="card-link" rel="noopener">bismuth.croft.click →</a>
			</div>
		</div>
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
		overflow: hidden;
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

	/* ── browser preview ──────────────────────────────────────────────────── */
	.card-preview {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--border);
	}

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
		color: var(--muted);
		letter-spacing: 0.02em;
	}

	.project-card.jasper .chrome-url {
		color: #fb923c;
	}

	.project-card.malachite .chrome-url {
		color: #3fb968;
	}

	.project-card.bismuth .chrome-url {
		color: #c4b5fd;
	}

	.preview-viewport {
		overflow: hidden;
		height: 130px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-2);
	}

	.project-card.jasper .preview-viewport {
		background: color-mix(in srgb, #fb923c 18%, var(--surface-2));
	}

	.project-card.malachite .preview-viewport {
		background: color-mix(in srgb, #3fb968 18%, var(--surface-2));
	}

	.project-card.bismuth .preview-viewport {
		background: color-mix(in srgb, #c4b5fd 18%, var(--surface-2));
	}

	.preview-logo {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	/* ── card body ─────────────────────────────────────────────────────────── */
	.card-body {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
		text-decoration: none;
		color: var(--text);
	}

	.card-header:hover .card-eyebrow {
		color: var(--text);
	}

	.card-logo {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		object-fit: contain;
	}

	.card-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		color: var(--muted);
		transition: color 0.15s;
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
		text-decoration: none;
		transition: color 0.15s;
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

		.card-preview {
			display: none;
		}

		.card-body {
			padding: 1.75rem;
		}
	}
</style>
