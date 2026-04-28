<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowRight, Github, Heart, Coffee } from '@lucide/svelte';

	interface Feature {
		icon: typeof import('@lucide/svelte').ArrowRight;
		title: string;
		description: string;
	}

	interface Step {
		title: string;
		description: string;
	}

	interface Props {
		name: string;
		logo: string;
		logoAlt?: string;
		eyebrow?: string;
		heading: Snippet;
		sub: Snippet;
		ctaHref: string;
		ctaLabel: string;
		ctaSub: string;
		githubUrl: string;
		features: Feature[];
		steps: Step[];
		aboutHref?: string;
		children?: Snippet;
	}

	let {
		name,
		logo,
		logoAlt = name,
		eyebrow,
		heading,
		sub,
		ctaHref,
		ctaLabel,
		ctaSub,
		githubUrl,
		features,
		steps,
		aboutHref = '/about',
		children
	}: Props = $props();
</script>

<main>
	<!-- ── Hero ───────────────────────────────────────────────────────────────── -->
	<section class="hero">
		<div class="logo-wrap">
			<img src={logo} alt={logoAlt} width={120} height={120} />
		</div>
		<p class="wordmark">{name}</p>
		{#if eyebrow}
			<p class="eyebrow">{eyebrow}</p>
		{/if}
		<h1>{@render heading()}</h1>
		<p class="sub">{@render sub()}</p>
		<div class="hero-actions">
			<a href={ctaHref} class="btn-primary">
				{ctaLabel} <ArrowRight size={16} />
			</a>
			<a href={githubUrl} target="_blank" rel="noopener" class="btn-ghost">
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

	<!-- ── Features ───────────────────────────────────────────────────────────── -->
	{#if features.length}
		<section class="features">
			{#each features as feature}
				<div class="feature-card">
					<span class="feature-icon"><feature.icon size={20} /></span>
					<h3>{feature.title}</h3>
					<p>{feature.description}</p>
				</div>
			{/each}
		</section>
	{/if}

	<!-- ── How it works ───────────────────────────────────────────────────────── -->
	{#if steps.length}
		<section class="how">
			<h2>How it works</h2>
			<ol class="steps-list">
				{#each steps as step, i}
					<li>
						<span class="step-num">{i + 1}</span>
						<div>
							<strong>{step.title}</strong>
							<p>{step.description}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	<!-- ── CTA ────────────────────────────────────────────────────────────────── -->
	<section class="cta">
		<h2>Ready?</h2>
		<p>{ctaSub}</p>
		<a href={ctaHref} class="btn-primary">
			{ctaLabel} <ArrowRight size={16} />
		</a>
	</section>

	<!-- ── Extra content ─────────────────────────────────────────────────────── -->
	{#if children}
		{@render children()}
	{/if}

	<footer>
		<a href={aboutHref}>About &amp; privacy</a>
		<span class="sep">·</span>
		<a href={githubUrl} target="_blank" rel="noopener">↗ GitHub</a>
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

	.logo-wrap {
		display: flex;
		justify-content: center;
		color: var(--accent);
		margin-bottom: 0.75rem;
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
		color: var(--bg);
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.65rem 1.25rem;
		border-radius: 6px;
		text-decoration: none;
		transition:
			background 0.15s,
			transform 0.1s;
	}

	.btn-primary:hover {
		transform: translateY(-1px);
		text-decoration: none;
	}

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

	.feature-icon {
		color: var(--accent);
		display: flex;
	}

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

	.steps-list li:last-child {
		border-bottom: none;
	}

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

	.cta h2 {
		margin-bottom: 0.5rem;
	}

	.cta p {
		font-size: 0.875rem;
		color: var(--muted);
		margin: 0 0 1.75rem;
	}

	.btn-sponsor-inline {
		color: #db61a2;
		border-color: rgba(219, 97, 162, 0.3);
	}

	.btn-sponsor-inline:hover {
		border-color: #db61a2;
		color: #db61a2;
	}

	.btn-kofi-inline {
		color: #ff5e5b;
		border-color: rgba(255, 94, 91, 0.3);
	}

	.btn-kofi-inline:hover {
		border-color: #ff5e5b;
		color: #ff5e5b;
	}

	/* ── Footer ───────────────────────────────────────────────────────────────── */
	footer {
		text-align: center;
		font-size: 0.78rem;
		color: var(--muted);
	}

	footer a {
		color: var(--muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	footer a:hover {
		color: var(--accent);
	}
	.sep {
		margin: 0 0.4rem;
	}

	/* ── Responsive ───────────────────────────────────────────────────── */
	@media (max-width: 480px) {
		.hero {
			padding: 1.5rem 0 2.5rem;
		}
		.features {
			grid-template-columns: 1fr 1fr;
		}
		.cta {
			padding: 1.75rem 1.25rem;
		}
	}
</style>
