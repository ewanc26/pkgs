<svelte:head>
	<title>croft.click</title>
</svelte:head>

<script lang="ts">
	import { coreProjects, extraProjects } from '$lib/data/projects';
	import Hero from '$lib/components/Hero.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import PairingGraph from '$lib/components/PairingGraph.svelte';
</script>

<main>
	<Hero />

	<section class="projects">
		{#each coreProjects as project}
			<ProjectCard {project} />
		{/each}
	</section>

	<div class="section-header">
		<span class="section-label">ALSO</span>
	</div>

	<section class="projects">
		{#each extraProjects as project}
			<ProjectCard {project} />
		{/each}
	</section>

	<PairingGraph />

	<Footer />
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
		padding: 3rem 1.5rem 1.5rem;
	}

	.projects {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		width: 100%;
		max-width: 72rem;
		margin-bottom: 3rem;
	}

	@media (max-width: 768px) {
		.projects {
			grid-template-columns: 1fr;
		}
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-width: 72rem;
		margin: 1.5rem 0 1.25rem;
	}

	.section-header::before,
	.section-header::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.section-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		color: var(--muted);
		white-space: nowrap;
	}
</style>
