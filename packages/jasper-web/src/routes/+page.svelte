<script lang="ts">
	import { Camera, Calendar, Lock, Zap, ArrowRight, Github, Heart, Coffee } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Jasper — Import Instagram photos to Grain</title>
	<meta name="description" content="Import your Instagram photos to Grain.social while preserving original timestamps. Free, open-source, runs in your browser." />
	<link rel="canonical" href="https://jasper.croft.click" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://jasper.croft.click" />
	<meta property="og:title" content="Jasper — Import Instagram photos to Grain" />
	<meta property="og:description" content="Import your Instagram photos to Grain.social while preserving original timestamps. Free, open-source, runs in your browser." />

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Jasper — Import Instagram photos to Grain" />
	<meta name="twitter:description" content="Import your Instagram photos to Grain.social while preserving original timestamps. Free, open-source, runs in your browser." />
</svelte:head>

<main>
	<!-- ── Hero ───────────────────────────────────────────────────────────────── -->
	<section class="hero">
		<div class="logo-wrap">
			<Camera class="hero-logo" size={120} />
		</div>
		<p class="wordmark">jasper</p>
		<p class="eyebrow">Open source · Runs in your browser</p>
		<h1>Your Instagram photos,<br />on Grain.</h1>
		<p class="sub">
			Jasper imports your Instagram photos to
			<a href="https://grain.social" target="_blank" rel="noopener">Grain.social</a>
			— preserving their original timestamps.
		</p>
		<div class="hero-actions">
			<a href="/import" class="btn-primary">
				Start importing <ArrowRight size={16} />
			</a>
			<a href="https://github.com/ewanc26/pkgs/tree/main/packages/jasper" target="_blank" rel="noopener" class="btn-ghost">
				<Github size={15} /> View on GitHub
			</a>
			<a href="https://github.com/sponsors/ewanc26" target="_blank" rel="noopener" class="btn-ghost btn-sponsor-inline">
				<Heart size={14} /> Sponsor
			</a>
			<a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener" class="btn-ghost btn-kofi-inline">
				<Coffee size={14} /> Ko-fi
			</a>
		</div>
	</section>

	<!-- ── Features ───────────────────────────────────────────────────── -->
	<section class="features">
		<div class="feature-card">
			<span class="feature-icon"><Calendar size={20} /></span>
			<h3>Original Dates</h3>
			<p>Photos appear with their original Instagram timestamps, not the import date.</p>
		</div>
		<div class="feature-card">
			<span class="feature-icon"><Lock size={20} /></span>
			<h3>Privacy-First</h3>
			<p>Everything runs in your browser. Your photos go directly to your Grain account.</p>
		</div>
		<div class="feature-card">
			<span class="feature-icon"><Zap size={20} /></span>
			<h3>Smart Import</h3>
			<p>Handles all Instagram export formats. Detects and skips duplicates automatically.</p>
		</div>
	</section>

	<!-- ── How it works ───────────────────────────────────────────────────────── -->
	<section class="how">
		<h2>How it works</h2>
		<ol class="steps-list">
			<li>
				<span class="step-num">1</span>
				<div>
					<strong>Export from Instagram</strong>
					<p>Download your data from Instagram as a ZIP file with JSON format.</p>
				</div>
			</li>
			<li>
				<span class="step-num">2</span>
				<div>
					<strong>Sign in with ATProto</strong>
					<p>Use OAuth to securely connect your Grain account. Nothing is stored.</p>
				</div>
			</li>
			<li>
				<span class="step-num">3</span>
				<div>
					<strong>Upload your export</strong>
					<p>Drop in your ZIP file — everything is processed locally in your browser.</p>
				</div>
			</li>
			<li>
				<span class="step-num">4</span>
				<div>
					<strong>Import</strong>
					<p>Jasper uploads your photos to Grain with their original timestamps preserved.</p>
				</div>
			</li>
		</ol>
	</section>

	<!-- ── CTA ────────────────────────────────────────────────────────────────── -->
	<section class="cta">
		<h2>Ready?</h2>
		<p>No account needed. No data leaves your browser except to your own PDS.</p>
		<a href="/import" class="btn-primary">
			Open the import tool <ArrowRight size={16} />
		</a>
	</section>

	<footer>
		<a href="/about">About &amp; privacy</a>
		<span class="sep">·</span>
		<a href="https://github.com/ewanc26/pkgs/tree/main/packages/jasper" target="_blank" rel="noopener">↗ GitHub</a>
		<span class="sep">·</span>
		<a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener">♥ Support</a>
	</footer>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 4rem 1.5rem 5rem;
	}

	/* ── Hero ─────────────────────────────────────────────────────────────────── */
	.hero {
		text-align: center;
		padding: 3rem 0 3.5rem;
	}

	.hero-logo {
		color: var(--accent);
		margin: 0 auto 0.75rem;
		display: block;
	}

	.wordmark {
		font-size: clamp(2rem, 5vw, 2.75rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--text);
		margin: 0 0 0.5rem;
	}

	.eyebrow {
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--accent);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin: 0 0 1.25rem;
	}

	h1 {
		font-size: clamp(1.65rem, 4vw, 2.5rem);
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.03em;
		color: var(--text);
		margin: 0 0 1.25rem;
	}

	.sub {
		font-size: 1.05rem;
		color: var(--muted);
		line-height: 1.6;
		max-width: 480px;
		margin: 0 auto 2.25rem;
	}

	.sub a { color: var(--accent); }

	.hero-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* ── Buttons ──────────────────────────────────────────────────────────────── */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--accent);
		color: #000;
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.65rem 1.25rem;
		border-radius: 6px;
		text-decoration: none;
		transition: background 0.15s, transform 0.1s;
	}

	.btn-primary:hover { background: #fdba74; transform: translateY(-1px); text-decoration: none; }

	/* ── Features ─────────────────────────────────────────────────────── */
	.features {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 0.75rem;
		margin-bottom: 4rem;
	}

	.feature-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.feature-icon { color: var(--accent); display: flex; }

	.feature-card h3 {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text);
		margin: 0;
	}

	.feature-card p {
		font-size: 0.8rem;
		color: var(--muted);
		line-height: 1.5;
		margin: 0;
	}

	/* ── How it works ─────────────────────────────────────────────────────────── */
	.how {
		margin-bottom: 4rem;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text);
		margin: 0 0 1.5rem;
		letter-spacing: -0.02em;
	}

	.steps-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.steps-list li {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--border);
	}

	.steps-list li:last-child { border-bottom: none; }

	.step-num {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--surface);
		border: 1.5px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--accent);
		flex-shrink: 0;
		margin-top: 1px;
	}

	.steps-list strong {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text);
		margin-bottom: 0.2rem;
	}

	.steps-list p {
		font-size: 0.825rem;
		color: var(--muted);
		line-height: 1.5;
		margin: 0;
	}

	/* ── CTA ──────────────────────────────────────────────────────────────────── */
	.cta {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 2.5rem;
		text-align: center;
		margin-bottom: 3rem;
	}

	.cta h2 { margin-bottom: 0.5rem; }

	.cta p {
		font-size: 0.875rem;
		color: var(--muted);
		margin: 0 0 1.75rem;
	}

	.btn-sponsor-inline {
		color: #db61a2;
		border-color: rgba(219, 97, 162, 0.3);
	}

	.btn-sponsor-inline:hover { border-color: #db61a2; color: #db61a2; }

	.btn-kofi-inline {
		color: #ff5e5b;
		border-color: rgba(255, 94, 91, 0.3);
	}

	.btn-kofi-inline:hover { border-color: #ff5e5b; color: #ff5e5b; }

	/* ── Footer ───────────────────────────────────────────────────────────────── */
	footer {
		text-align: center;
		font-size: 0.78rem;
		color: var(--muted);
	}

	footer a { color: var(--muted); text-decoration: underline; text-underline-offset: 3px; }
	footer a:hover { color: var(--accent); }
	.sep { margin: 0 0.4rem; }

	/* ── Responsive ───────────────────────────────────────────────────── */
	@media (max-width: 480px) {
		.hero { padding: 1.5rem 0 2.5rem; }
		.features { grid-template-columns: 1fr 1fr; }
		.cta { padding: 1.75rem 1.25rem; }
	}
</style>
