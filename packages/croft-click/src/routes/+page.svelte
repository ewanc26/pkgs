<svelte:head>
	<title>croft.click</title>
</svelte:head>

<script lang="ts">
	import { projects } from '$lib/data/projects';
	import Hero from '$lib/components/Hero.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<main>
	<Hero />

	<section class="projects">
		{#each projects as project}
			<ProjectCard {project} />
		{/each}
	</section>

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
</style>
