<script lang="ts">
    import { renderNoiseAvatar } from '@ewanc26/noise-avatar';
    import Discovery from './Discovery.svelte';
    import OnThisDay from './OnThisDay.svelte';
    import type { ListenerProfile } from '$lib/types';
    import type { OnThisDayEntry } from '$lib/analysis/on-this-day';

    let { 
        profile, 
        onThisDayEntries 
    }: { 
        profile: ListenerProfile; 
        onThisDayEntries: OnThisDayEntry[] 
    } = $props();

    function noiseAvatar(canvas: HTMLCanvasElement, seed: string) {
        renderNoiseAvatar(canvas, seed, { displaySize: 32, gridSize: 5 });
        return {
            update(newSeed: string) {
                renderNoiseAvatar(canvas, newSeed, { displaySize: 32, gridSize: 5 });
            }
        };
    }
</script>

<!-- Top artists -->
<div class="mb-6 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
    <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Top Artists</h2>
    <ol class="space-y-2">
        {#each profile.topArtists.slice(0, 25) as artist, i (artist.name)}
            <li class="flex items-center gap-2 overflow-hidden sm:gap-3">
                <span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
                {#if artist.imageUrl}
                    <img src={artist.imageUrl} alt={artist.name} class="h-7 w-7 shrink-0 rounded sm:h-8 sm:w-8" />
                {:else}
                    <canvas use:noiseAvatar={artist.name} class="h-7 w-7 shrink-0 rounded sm:h-8 sm:w-8"></canvas>
                {/if}
                <span class="min-w-0 shrink truncate">{artist.name}</span>
                <span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{artist.count.toLocaleString()}</span>
            </li>
        {/each}
    </ol>
</div>

<!-- Top tracks + albums side by side -->
<div class="mb-6 grid gap-4 sm:mb-8 sm:gap-8 lg:grid-cols-2">
    <div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Top Tracks</h2>
        <ol class="space-y-2">
            {#each profile.topTracks.slice(0, 25) as track, i (i)}
                <li class="flex items-center gap-2 overflow-hidden sm:gap-3">
                    <span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
                    <span class="min-w-0 shrink truncate">
                        <span class="font-medium">{track.name}</span>
                        <span class="text-xs text-[var(--text-muted)] sm:text-sm"> — {track.artist}</span>
                    </span>
                    <span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{track.count.toLocaleString()}</span>
                </li>
            {/each}
        </ol>
    </div>

    <div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Top Albums</h2>
        <ol class="space-y-2">
            {#each profile.topAlbums.slice(0, 25) as album, i (i)}
                <li class="flex items-center gap-2 overflow-hidden sm:gap-3">
                    <span class="w-5 shrink-0 text-right text-xs text-[var(--text-muted)] sm:w-6 sm:text-sm">{i + 1}</span>
                    <span class="min-w-0 shrink truncate">
                        <span class="font-medium">{album.name}</span>
                        <span class="text-xs text-[var(--text-muted)] sm:text-sm"> — {album.artist}</span>
                    </span>
                    <span class="shrink-0 font-mono text-xs text-[var(--text-muted)] sm:text-sm">{album.count.toLocaleString()}</span>
                </li>
            {/each}
        </ol>
    </div>
</div>

{#if profile.discoveredArtists.length > 0 || profile.discoveredTracks.length > 0 || profile.discoveredAlbums.length > 0}
    <div class="mb-6 sm:mb-8">
        <Discovery
            artists={profile.discoveredArtists}
            tracks={profile.discoveredTracks}
            albums={profile.discoveredAlbums}
        />
    </div>
{/if}

{#if onThisDayEntries.length > 0}
    <div class="mb-6 sm:mb-8">
        <OnThisDay entries={onThisDayEntries} />
    </div>
{/if}
