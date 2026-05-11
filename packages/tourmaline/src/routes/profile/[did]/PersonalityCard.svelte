<script lang="ts">
	import { Share2 } from '@lucide/svelte';
	import type { ListenerProfile } from '$lib/types';
	import type { PersonalityProfile } from '$lib/analysis/personality';

	let { profile, displayName, personality }: { profile: ListenerProfile; displayName: string; personality: PersonalityProfile } = $props();

	const STORAGE_KEY = 'tourmaline:share';

	/** Genre bar colour per category (consistent across renders). */
	const GENRE_COLORS: Record<string, string> = {
		Metal: '#ef4444',
		Rock: '#f97316',
		Pop: '#eab308',
		Electronic: '#22d3ee',
		'Hip Hop': '#a855f7',
		Jazz: '#f59e0b',
		Classical: '#d4d4d8',
		Folk: '#a3e635',
		Country: '#fb923c',
		'R&B': '#ec4899',
		Blues: '#3b82f6',
		Reggae: '#10b981',
		Latin: '#f43f5e',
		World: '#14b8a6',
		Soundtrack: '#8b5cf6',
		'New Age': '#67e8f9',
		Punk: '#dc2626',
		'Singer-Songwriter': '#fbbf24'
	};

	/** Mood dot colour. */
	const MOOD_COLORS: Record<string, string> = {
		Energetic: '#f97316',
		Melancholic: '#6366f1',
		Chill: '#22d3ee',
		Happy: '#facc15',
		Aggressive: '#ef4444',
		Atmospheric: '#8b5cf6',
		Nostalgic: '#f59e0b',
		Dark: '#6b7280'
	};

	/** Top genres for bar chart (max 5). */
	const topGenres = $derived(profile.genres.slice(0, 5));
	const maxGenreWeight = $derived(topGenres[0]?.weight ?? 1);

	/** Top moods for indicator (max 4). */
	const topMoods = $derived(
		Object.entries(profile.mood)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 4)
			.filter(([, v]) => v > 0)
	);

	function share() {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				archetype: personality.archetype,
				archetypeBlurb: personality.archetypeBlurb,
				traits: personality.traits,
				genres: topGenres.map((g) => ({ name: g.name, weight: g.weight })),
				mood: Object.fromEntries(topMoods),
				diversityScore: profile.diversityScore,
				obscurityIndex: profile.obscurityIndex,
				displayName
			})
		);
		const params = new URLSearchParams({ handle: profile.handle ?? '', did: profile.did });
		window.location.href = `/share?${params}`;
	}
</script>

<div class="rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
	<!-- Archetype header -->
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--text-dim)]">Listener archetype</p>
			<h2 class="mt-1.5 text-xl font-bold text-[var(--accent)] sm:text-2xl">{personality.archetype}</h2>
			<p class="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{personality.archetypeBlurb}</p>
		</div>
		<div class="flex shrink-0 flex-col items-end gap-1.5">
			<span class="rounded border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-mono text-xs text-[var(--text-muted)]">
				Diversity {profile.diversityScore}<span class="text-[var(--text-dim)]">/100</span>
			</span>
			<span class="rounded border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-mono text-xs text-[var(--text-muted)]">
				Obscurity {profile.obscurityIndex}<span class="text-[var(--text-dim)]">/100</span>
			</span>
		</div>
	</div>

	<!-- Genre bars -->
	{#if topGenres.length > 0}
		<div class="mt-5">
			<p class="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--text-dim)]">Genre profile</p>
			<div class="space-y-2">
				{#each topGenres as genre (genre.name)}
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 truncate text-xs text-[var(--text-muted)] sm:w-24">{genre.name}</span>
						<div class="flex-1 h-1.5 rounded-full bg-[var(--bg)]">
							<div
								class="h-full rounded-full transition-all duration-700"
								style="width: {(genre.weight / maxGenreWeight) * 100}%; background-color: {GENRE_COLORS[genre.name] ?? 'var(--accent)'}"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Mood indicators -->
	{#if topMoods.length > 0}
		<div class="mt-4">
			<p class="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--text-dim)]">Mood profile</p>
			<div class="flex flex-wrap gap-2">
				{#each topMoods as [mood, score] (mood)}
					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs"
					>
						<span class="inline-block h-2 w-2 rounded-full" style="background-color: {MOOD_COLORS[mood] ?? 'var(--accent)'}"></span>
						<span class="text-[var(--text-muted)]">{mood}</span>
						<span class="font-mono text-[var(--text-dim)]">{score}</span>
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Divider -->
	<div class="my-5 border-t border-[var(--border)]"></div>

	<!-- Traits grid -->
	<ul class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
		{#each personality.traits as trait (trait.label)}
			<li class="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
				<p class="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--accent-dim)] opacity-70">{trait.label}</p>
				<p class="mt-1 text-sm font-semibold text-[var(--text)]">{trait.value}</p>
				<p class="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{trait.detail}</p>
			</li>
		{/each}
	</ul>

	<!-- Share button -->
	<button
		class="mt-5 flex w-full items-center justify-center gap-2 rounded border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
		onclick={share}
	>
		<Share2 size={15} />
		Share to Bluesky
	</button>
</div>
