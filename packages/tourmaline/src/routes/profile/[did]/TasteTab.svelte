<script lang="ts">
    import GenreChart from './GenreChart.svelte';
    import MoodRadar from './MoodRadar.svelte';
    import EraBarChart from './EraBarChart.svelte';
    import MusicEvolution from './MusicEvolution.svelte';
    import ListeningPhases from './ListeningPhases.svelte';
    import RemarkableDays from './RemarkableDays.svelte';
    import Milestones from './Milestones.svelte';
    import type { ListenerProfile } from '$lib/types';

    let { profile }: { profile: ListenerProfile } = $props();
</script>

<div class="mb-6 grid gap-4 sm:mb-8 sm:gap-8 lg:grid-cols-2">
    {#if profile.genres.length > 0}
        <div class="rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
            <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Genre Profile</h2>
            <GenreChart genres={profile.genres} />
        </div>
    {/if}

    {#if Object.keys(profile.mood).length > 0}
        <div class="rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
            <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Mood Profile</h2>
            <MoodRadar mood={profile.mood} />
        </div>
    {/if}
</div>

{#if profile.era.length > 0}
    <div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
        <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Era Preference</h2>
        <EraBarChart era={profile.era} />
    </div>
{/if}

{#if profile.monthlyGenres.length >= 3}
    <div class="mb-6 sm:mb-8">
        <MusicEvolution monthlyGenres={profile.monthlyGenres} />
    </div>
{/if}

{#if profile.phases.length >= 2}
    <div class="mb-6 sm:mb-8">
        <ListeningPhases phases={profile.phases} />
    </div>
{/if}

{#if profile.remarkableDays.length > 0}
    <div class="mb-6 sm:mb-8">
        <RemarkableDays days={profile.remarkableDays} />
    </div>
{/if}

{#if profile.scrobbleMilestones.length > 0}
    <div class="mb-6 sm:mb-8">
        <Milestones
            scrobbles={profile.scrobbleMilestones}
            artists={profile.artistMilestones}
            tracks={profile.trackMilestones}
            albums={profile.albumMilestones}
        />
    </div>
{/if}
