<script lang="ts">
	import logo from '$lib/assets/logo.svg';
	import { ArrowRight, Github, Heart, Coffee, FileText } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Bismuth — ATProto richtext-block to Markdown</title>
</svelte:head>

<main>
	<!-- ── Hero ───────────────────────────────────────────────────────────────── -->
	<section class="hero">
		<div class="logo-wrap">
			<img src={logo} alt="Bismuth" width={120} height={120} />
		</div>
		<p class="wordmark">bismuth</p>
		<p class="eyebrow">Open source · Runs in your browser</p>
		<h1>Convert ATProto documents<br />to Markdown.</h1>
		<p class="sub">
			Bismuth converts richtext-block documents from
			<a href="https://standard.site" target="_blank" rel="noopener">Standard.site</a> publications
			— Leaflet, Pckt, and Offprint — into clean Markdown.
		</p>
		<div class="hero-actions">
			<a href="/convert" class="btn-primary">
				Open converter <ArrowRight size={16} />
			</a>
			<a
				href="https://github.com/ewanc26/pkgs/tree/main/packages/bismuth"
				target="_blank"
				rel="noopener"
				class="btn-ghost"
			>
				<Github size={15} /> View on GitHub
			</a>
			<a
				href="https://github.com/sponsors/ewanc26"
				target="_blank"
				rel="noopener"
				class="btn-ghost btn-sponsor-inline"
			>
				<Heart size={14} /> Sponsor
			</a>
			<a
				href="https://ko-fi.com/ewancroft"
				target="_blank"
				rel="noopener"
				class="btn-ghost btn-kofi-inline"
			>
				<Coffee size={14} /> Ko-fi
			</a>
		</div>
	</section>

	<!-- ── Features ───────────────────────────────────────────────────── -->
	<section class="features">
		<div class="feature-card">
			<span class="feature-icon"><FileText size={20} /></span>
			<h3>Leaflet</h3>
			<p>Convert pub.leaflet.content and site.standard.document records with full block support.</p>
		</div>
		<div class="feature-card">
			<span class="feature-icon"><FileText size={20} /></span>
			<h3>Pckt</h3>
			<p>Handle blog.pckt.content with inline and blob-mode content resolution.</p>
		</div>
		<div class="feature-card">
			<span class="feature-icon"><FileText size={20} /></span>
			<h3>Offprint</h3>
			<p>Support app.offprint.content including task lists, web embeds, and coloured highlights.</p>
		</div>
	</section>

	<!-- ── How it works ───────────────────────────────────────────────────────── -->
	<section class="how">
		<h2>How it works</h2>
		<ol class="steps-list">
			<li>
				<span class="step-num">1</span>
				<div>
					<strong>Paste or upload</strong>
					<p>Paste your ATProto document JSON or upload a .json file.</p>
				</div>
			</li>
			<li>
				<span class="step-num">2</span>
				<div>
					<strong>Convert</strong>
					<p>Bismuth detects the content type and converts it to Markdown — all in your browser.</p>
				</div>
			</li>
			<li>
				<span class="step-num">3</span>
				<div>
					<strong>Copy or download</strong>
					<p>Copy the Markdown to your clipboard or download it as a .md file.</p>
				</div>
			</li>
		</ol>
	</section>

	<!-- ── CTA ────────────────────────────────────────────────────────────────── -->
	<section class="cta">
		<h2>Ready?</h2>
		<p>No sign-in needed. No data leaves your browser.</p>
		<a href="/convert" class="btn-primary">
			Open the converter <ArrowRight size={16} />
		</a>
	</section>

	<footer>
		<a href="/about">About &amp; privacy</a>
		<span class="sep">·</span>
		<a
			href="https://github.com/ewanc26/pkgs/tree/main/packages/bismuth"
			target="_blank"
			rel="noopener">↗ GitHub</a
		>
		<span class="sep">·</span>
		<a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener">♥ Support</a>
	</footer>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
	}

	/* ── hero ──────────────────────────────────────────────────────────────── */
	.hero {
		text-align: center;
		padding: 4rem 1.5rem 3rem;
		max-width: 36rem;
	}

	.logo-wrap {
		margin: 0 auto 1.25rem;
		width: 120px;
		height: 120px;
	}
	.logo-wrap img {
		width: 100%;
		height: 100%;
	}

	.wordmark {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--accent);
		letter-spacing: -0.02em;
		margin: 0 0 0.5rem;
	}

	.eyebrow {
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0 0 1.5rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.03em;
		margin: 0 0 1rem;
	}

	.sub {
		color: var(--muted);
		font-size: 1.05rem;
		line-height: 1.5;
		margin: 0 0 1.5rem;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
	}
	.hero-actions .btn-primary {
		width: auto;
		margin-top: 0;
	}

	/* ── features ──────────────────────────────────────────────────────────── */
	.features {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		width: 100%;
		max-width: 48rem;
		padding: 0 1.5rem 3rem;
	}

	.feature-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.feature-icon {
		color: var(--accent);
		display: flex;
		margin-bottom: 0.75rem;
	}

	.feature-card h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.4rem;
	}

	.feature-card p {
		color: var(--muted);
		font-size: 0.825rem;
		line-height: 1.5;
		margin: 0;
	}

	/* ── how it works ──────────────────────────────────────────────────────── */
	.how {
		width: 100%;
		max-width: 36rem;
		padding: 0 1.5rem 3rem;
	}

	h2 {
		font-size: 1.3rem;
		font-weight: 600;
		margin: 0 0 1.25rem;
	}

	.steps-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.steps-list li {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.step-num {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 50%;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: 'JetBrains Mono', monospace;
		color: var(--accent);
		flex-shrink: 0;
	}

	.steps-list strong {
		font-size: 0.95rem;
		display: block;
		margin-bottom: 0.2rem;
	}

	.steps-list p {
		color: var(--muted);
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
	}

	/* ── CTA ───────────────────────────────────────────────────────────────── */
	.cta {
		text-align: center;
		padding: 0 1.5rem 3rem;
		max-width: 28rem;
	}

	.cta p {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0 0 1.25rem;
	}

	.cta .btn-primary {
		width: auto;
		display: inline-flex;
		margin-top: 0;
	}

	/* ── footer ─────────────────────────────────────────────────────────────── */
	main > footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--muted);
		border-top: 1px solid var(--border);
		width: 100%;
		justify-content: center;
	}

	main > footer a {
		color: var(--muted);
		text-decoration: none;
		transition: color 0.15s;
	}

	main > footer a:hover {
		color: var(--text);
	}

	.sep {
		color: var(--border);
	}

	/* ── responsive ────────────────────────────────────────────────────────── */
	@media (max-width: 640px) {
		h1 {
			font-size: 2rem;
		}

		.features {
			grid-template-columns: 1fr;
		}
	}
</style>
