<script lang="ts">
    import StoryRecap from './StoryRecap.svelte';
    import MinutesListened from './MinutesListened.svelte';
    import ListeningClock from './ListeningClock.svelte';
    import MoodRadar from './MoodRadar.svelte';
    import ListeningStats from './ListeningStats.svelte';
    import PersonalityCard from './PersonalityCard.svelte';
    import YearlyWrapped from './YearlyWrapped.svelte';
    import type { ListenerProfile, TealScrobble } from '$lib/types';
    import type { SessionStats } from '$lib/analysis/sessions';
    import type { StoryRecap as StoryRecapData } from '$lib/analysis/story-recap';
    import type { PersonalityProfile } from '$lib/analysis/personality';

    let { 
        profile, 
        storyRecap, 
        dateRange, 
        bskyDisplayName, 
        handle, 
        did, 
        personality 
    }: { 
        profile: ListenerProfile; 
        storyRecap: StoryRecapData | null; 
        dateRange: string;
        bskyDisplayName: string | undefined;
        handle: string | undefined;
        did: string;
        personality: PersonalityProfile | null;
    } = $props();
</script>

{#if storyRecap}
    <div class="mb-6 sm:mb-8">
        {#key dateRange}
            <StoryRecap recap={storyRecap} />
        {/key}
    </div>
{/if}

{#if profile.totalMinutes > 0}
    <div class="mb-6 sm:mb-8">
        <MinutesListened minutes={profile.totalMinutes} rangeLabel={dateRange === 'all' ? 'all-time' : dateRange.replace('d', '-day')} />
    </div>
{/if}

<div class="mb-6 grid gap-4 sm:mb-8 sm:gap-8 lg:grid-cols-2">
    {#if profile.scrobblesByHour.some((n) => n > 0)}
        <div class="rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
            <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Listening Clock</h2>
            <ListeningClock scrobblesByHour={profile.scrobblesByHour} />
        </div>
    {/if}

    {#if Object.keys(profile.mood).length > 0 && Object.values(profile.mood).some((v) => v > 0)}
        <div class="rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
            <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Mood Profile</h2>
            <MoodRadar mood={profile.mood} />
        </div>
    {/if}
</div>

{#if profile.dailyScrobbles.length > 0}
    <div class="mb-6 sm:mb-8">
        <ListeningStats
            dailyScrobbles={profile.dailyScrobbles}
            totalScrobbles={profile.totalScrobbles}
            longestGap={profile.longestNotListenedGap}
            range={dateRange}
            statsData={profile}
        />
    </div>
{/if}

{#if personality}
    <div class="mb-8">
        <PersonalityCard {profile} displayName={bskyDisplayName ?? handle ?? did} {personality} />
    </div>
{/if}

<div class="mt-8">
    <YearlyWrapped {profile} displayName={bskyDisplayName ?? handle ?? did} />
</div>
