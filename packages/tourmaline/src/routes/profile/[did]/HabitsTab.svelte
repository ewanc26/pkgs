<script lang="ts">
    import ListeningClock from './ListeningClock.svelte';
    import PunchcardHeatmap from './PunchcardHeatmap.svelte';
    import TimelineHeatmap from './TimelineHeatmap.svelte';
    import EddingtonChart from './EddingtonChart.svelte';
    import ServiceOrigins from './ServiceOrigins.svelte';
    import ListeningSessions from './ListeningSessions.svelte';
    import type { ListenerProfile } from '$lib/types';
    import type { SessionStats } from '$lib/analysis/sessions';

    let { 
        profile, 
        sessionStats 
    }: { 
        profile: ListenerProfile; 
        sessionStats: SessionStats | null 
    } = $props();
</script>

{#if profile.scrobblesByHour.some((n) => n > 0)}
    <div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
        <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Listening Clock</h2>
        <ListeningClock scrobblesByHour={profile.scrobblesByHour} />
    </div>
{/if}

{#if profile.timeline.length > 0}
    <div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
        <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Hour × Day Heatmap</h2>
        <PunchcardHeatmap timeline={profile.timeline} />
    </div>
{/if}

{#if profile.dailyScrobbles.length > 0}
    <div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
        <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Listening Timeline</h2>
        <TimelineHeatmap dailyScrobbles={profile.dailyScrobbles} />
    </div>
{/if}

{#if profile.dailyScrobbles.length > 0}
    <div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
        <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Scrobbles per Day</h2>
        <EddingtonChart
            dailyScrobbles={profile.dailyScrobbles}
            eddingtonNumber={profile.eddingtonNumber}
        />
    </div>
{/if}

{#if Object.keys(profile.serviceOrigins).length > 0}
    <div class="mb-6 sm:mb-8">
        <p class="mb-2 font-mono text-xs uppercase tracking-wide text-[var(--text-dim)]">Scrobble sources</p>
        <ServiceOrigins origins={profile.serviceOrigins} />
    </div>
{/if}

{#if sessionStats}
    <div class="mb-6 sm:mb-8">
        <ListeningSessions stats={sessionStats} />
    </div>
{/if}
