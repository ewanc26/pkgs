<script lang="ts">
	import type { Project } from '$lib/data/projects';

	let { project }: { project: Project } = $props();
</script>

<div class="project-card" style="--accent: {project.accent}">
	<a href={project.url} class="card-preview" rel="noopener" aria-label="Visit {project.name}">
		<img src={project.logo} alt="" class="preview-logo" />
		<span class="card-eyebrow" aria-hidden="true">{project.name.toUpperCase()}</span>
	</a>
	<div class="card-body">
		<h2>{project.heading}</h2>
		<p>{project.description}</p>
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

	/* ── preview (logo + name, links to project) ──────────────────────────── */
	.card-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		height: 160px;
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-2));
		border-bottom: 1px solid var(--border);
		text-decoration: none;
		transition: background 0.2s;
	}

	.card-preview:hover {
		background: color-mix(in srgb, var(--accent) 26%, var(--surface-2));
	}

	.preview-logo {
		width: 64px;
		height: 64px;
		object-fit: contain;
		display: block;
	}

	.card-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		color: #ffffff;
		transition: color 0.15s;
	}

	.card-preview:hover .card-eyebrow {
		color: var(--text);
	}

	/* ── card body ─────────────────────────────────────────────────────────── */
	.card-body {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.6rem;
		line-height: 1.3;
		color: #ffffff;
	}

	.card-body p {
		color: var(--muted);
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0;
		flex: 1;
	}

	/* ── responsive ───────────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.card-preview {
			height: 120px;
		}
	}
</style>
