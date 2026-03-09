<script lang="ts">
	import type { KofiSupportersProps, KofiEventType } from './types.js';

	let {
		supporters = [],
		heading = 'Supporters',
		description = 'People who support my work on Ko-fi.',
		filter = undefined,
		loading = false,
		error = null
	}: KofiSupportersProps = $props();

	const TYPE_LABELS: Record<KofiEventType, string> = {
		Donation: '☕',
		Subscription: '⭐',
		Commission: '🎨',
		'Shop Order': '🛍️'
	};

	let visible = $derived(
		filter
			? supporters.filter((s) => s.types.some((t) => filter!.includes(t)))
			: supporters
	);

	/** Deterministic pastel colour from a name string. */
	function nameToHsl(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
		const h = Math.abs(hash) % 360;
		return `hsl(${h} 55% 70%)`;
	}

	/** Initials from a display name. */
	function initials(name: string): string {
		return name
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}
</script>

<section class="kofi-supporters" aria-label={heading}>
	<header class="kofi-supporters__header">
		<h2 class="kofi-supporters__heading">{heading}</h2>
		{#if description}
			<p class="kofi-supporters__description">{description}</p>
		{/if}
	</header>

	{#if loading}
		<ul class="kofi-supporters__grid" aria-busy="true" aria-label="Loading supporters">
			{#each { length: 6 } as _}
				<li class="kofi-supporters__item kofi-supporters__item--skeleton" aria-hidden="true">
					<span class="kofi-supporters__avatar kofi-supporters__avatar--skeleton"></span>
					<span class="kofi-supporters__name kofi-supporters__name--skeleton"></span>
				</li>
			{/each}
		</ul>
	{:else if error}
		<p class="kofi-supporters__error" role="alert">{error}</p>
	{:else if visible.length === 0}
		<p class="kofi-supporters__empty">No supporters yet — be the first!</p>
	{:else}
		<ul class="kofi-supporters__grid">
			{#each visible as supporter (supporter.name)}
				{@const typeIcons = supporter.types.map((t) => TYPE_LABELS[t]).join('')}
				<li class="kofi-supporters__item">
					<span
						class="kofi-supporters__card"
						title="{supporter.name} · {supporter.types.join(', ')}{supporter.tiers.length ? ` · ${supporter.tiers.join(', ')}` : ''}"
					>
						<span
							class="kofi-supporters__avatar"
							style="background-color: {nameToHsl(supporter.name)}"
							aria-hidden="true"
						>
							{initials(supporter.name)}
						</span>
						<span class="kofi-supporters__name">{supporter.name}</span>
						<span class="kofi-supporters__icons" aria-label={supporter.types.join(', ')}>{typeIcons}</span>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.kofi-supporters {
		container-type: inline-size;
	}

	.kofi-supporters__header {
		margin-block-end: 1rem;
	}

	.kofi-supporters__heading {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}

	.kofi-supporters__description {
		margin-block-start: 0.25rem;
		font-size: 0.875rem;
		opacity: 0.75;
	}

	.kofi-supporters__grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.kofi-supporters__card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		cursor: default;
	}

	.kofi-supporters__avatar {
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

	.kofi-supporters__name {
		font-size: 0.75rem;
		text-align: center;
		max-width: 5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.kofi-supporters__icons {
		font-size: 0.65rem;
		line-height: 1;
	}

	/* Skeletons */
	.kofi-supporters__item--skeleton {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem;
	}

	.kofi-supporters__avatar--skeleton {
		display: block;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background-color: color-mix(in srgb, currentColor 15%, transparent);
		animation: ks-pulse 1.4s ease-in-out infinite;
	}

	.kofi-supporters__name--skeleton {
		display: block;
		width: 4rem;
		height: 0.75rem;
		border-radius: 0.25rem;
		background-color: color-mix(in srgb, currentColor 15%, transparent);
		animation: ks-pulse 1.4s ease-in-out 200ms infinite;
	}

	@keyframes ks-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.kofi-supporters__error,
	.kofi-supporters__empty {
		font-size: 0.875rem;
		opacity: 0.75;
	}

	.kofi-supporters__error {
		color: #c0392b;
	}
</style>
