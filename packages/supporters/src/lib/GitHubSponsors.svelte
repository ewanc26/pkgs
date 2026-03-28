<script lang="ts">
	import type { GitHubSponsorsProps } from './github-types.js';

	let {
		sponsors = [],
		heading = 'GitHub Sponsors',
		description = 'People who sponsor my work on GitHub.',
		activeOnly = true,
		loading = false,
		error = null
	}: GitHubSponsorsProps = $props();

	let visible = $derived(activeOnly ? sponsors.filter((s) => s.isActive) : sponsors);

	/** Deterministic pastel colour from a login string. */
	function loginToHsl(login: string): string {
		let hash = 0;
		for (let i = 0; i < login.length; i++) hash = login.charCodeAt(i) + ((hash << 5) - hash);
		const h = Math.abs(hash) % 360;
		return `hsl(${h} 55% 70%)`;
	}

	function initials(name: string): string {
		return name
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}
</script>

<section class="gh-sponsors" aria-label={heading}>
	<header class="gh-sponsors__header">
		<h2 class="gh-sponsors__heading">{heading}</h2>
		{#if description}
			<p class="gh-sponsors__description">{description}</p>
		{/if}
	</header>

	{#if loading}
		<ul class="gh-sponsors__grid" aria-busy="true" aria-label="Loading sponsors">
			{#each { length: 6 } as _}
				<li class="gh-sponsors__item gh-sponsors__item--skeleton" aria-hidden="true">
					<span class="gh-sponsors__avatar gh-sponsors__avatar--skeleton"></span>
					<span class="gh-sponsors__name gh-sponsors__name--skeleton"></span>
				</li>
			{/each}
		</ul>
	{:else if error}
		<p class="gh-sponsors__error" role="alert">{error}</p>
	{:else if visible.length === 0}
		<p class="gh-sponsors__empty">No sponsors yet — be the first!</p>
	{:else}
		<ul class="gh-sponsors__grid">
			{#each visible as sponsor (sponsor.login)}
				<li class="gh-sponsors__item">
					<a
						class="gh-sponsors__card"
						href="https://github.com/{sponsor.login}"
						target="_blank"
						rel="noopener noreferrer"
						title="{sponsor.name ?? sponsor.login} · {sponsor.tierName}"
					>
						<span
							class="gh-sponsors__avatar"
							style="background-color: {loginToHsl(sponsor.login)}"
							aria-hidden="true"
						>
							{initials(sponsor.name ?? sponsor.login)}
						</span>
						<span class="gh-sponsors__name">{sponsor.name ?? sponsor.login}</span>
						<span class="gh-sponsors__tier" aria-label="Tier: {sponsor.tierName}">{sponsor.tierName}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.gh-sponsors {
		container-type: inline-size;
	}

	.gh-sponsors__header {
		margin-block-end: 1rem;
	}

	.gh-sponsors__heading {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}

	.gh-sponsors__description {
		margin-block-start: 0.25rem;
		font-size: 0.875rem;
		opacity: 0.75;
	}

	.gh-sponsors__grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.gh-sponsors__card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
	}

	.gh-sponsors__card:hover .gh-sponsors__avatar {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.gh-sponsors__avatar {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		flex-shrink: 0;
	}

	.gh-sponsors__name {
		font-size: 0.75rem;
		text-align: center;
		max-width: 5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.gh-sponsors__tier {
		font-size: 0.6rem;
		opacity: 0.65;
		text-align: center;
		max-width: 5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Skeletons */
	.gh-sponsors__item--skeleton {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem;
	}

	.gh-sponsors__avatar--skeleton {
		display: block;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background-color: color-mix(in srgb, currentColor 15%, transparent);
		animation: ghs-pulse 1.4s ease-in-out infinite;
	}

	.gh-sponsors__name--skeleton {
		display: block;
		width: 4rem;
		height: 0.75rem;
		border-radius: 0.25rem;
		background-color: color-mix(in srgb, currentColor 15%, transparent);
		animation: ghs-pulse 1.4s ease-in-out 200ms infinite;
	}

	@keyframes ghs-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.gh-sponsors__error,
	.gh-sponsors__empty {
		font-size: 0.875rem;
		opacity: 0.75;
	}

	.gh-sponsors__error {
		color: #c0392b;
	}
</style>
