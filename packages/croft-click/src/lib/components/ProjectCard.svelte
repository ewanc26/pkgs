<script lang="ts">
	import type { Project } from '$lib/data/projects';
	import BrowserChrome from './BrowserChrome.svelte';
	import { ArrowRight } from '@lucide/svelte';

	let { project }: { project: Project } = $props();
</script>

<div class="project-card" style="--accent: {project.accent}">
	<div class="card-preview">
		<BrowserChrome url="{project.slug}.croft.click" accent={project.accent} />
		<div class="preview-viewport">
			<img src={project.logo} alt="The {project.name} logo" class="preview-logo" />
		</div>
	</div>
	<div class="card-body">
		<a href={project.url} class="card-header" rel="noopener">
			<img src={project.logo} alt="The {project.name} logo" class="card-logo" width={28} height={28} />
			<span class="card-eyebrow">{project.name.toUpperCase()}</span>
		</a>
		<h2>{project.heading}</h2>
		<p>{project.description}</p>
		<a href={project.url} class="card-link inline-flex items-center gap-1" rel="noopener">{project.slug}.croft.click <ArrowRight size={12} /></a>
	</div>
</div>

<style>
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
		border-color: var(--accent);
	}

	/* ── browser preview ──────────────────────────────────────────────────── */
	.card-preview {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--border);
	}

	.preview-viewport {
		overflow: hidden;
		height: 130px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-2));
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

	.card-body p {
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

	.project-card:hover .card-link {
		color: var(--accent);
	}

	/* ── responsive ───────────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.card-preview {
			display: none;
		}

		.card-body {
			padding: 1.75rem;
		}
	}
</style>
