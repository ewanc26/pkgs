<script lang="ts">
	import { onMount } from 'svelte';
	import { renderNoiseAvatar } from '@ewanc26/noise-avatar';
	import { Loader2, Cpu, Sparkles, Music2, Users, LayoutGrid, Gem } from '@lucide/svelte';
	import type { DateRangePreset } from '$lib/analysis/date-range';
	import {
		loadProfile,
		emptyResults,
		type RangeKey,
		type LoadPhase,
		type ProfileResults
	} from '$lib/client/load-profile';
	import GenreChart from './GenreChart.svelte';
	import TimelineHeatmap from './TimelineHeatmap.svelte';
	import TimelineChart from '$lib/components/TimelineChart.svelte';
	import TopArtistsChart from '$lib/components/TopArtistsChart.svelte';
	import MoodRadar from './MoodRadar.svelte';
	import EraBarChart from './EraBarChart.svelte';
	import PersonalityCard from './PersonalityCard.svelte';
	import ListeningClock from './ListeningClock.svelte';
	import ListeningStats from './ListeningStats.svelte';
	import ServiceOrigins from './ServiceOrigins.svelte';
	import MinutesListened from './MinutesListened.svelte';
	import MusicEvolution from './MusicEvolution.svelte';
	import RemarkableDays from './RemarkableDays.svelte';
	import Discovery from './Discovery.svelte';
	import Milestones from './Milestones.svelte';
	import YearlyWrapped from './YearlyWrapped.svelte';
	import ProfileTabs from './ProfileTabs.svelte';
	import ListeningSessions from './ListeningSessions.svelte';
	import OnThisDay from './OnThisDay.svelte';
	import DateRangePicker from './DateRangePicker.svelte';
	import ListeningPhases from './ListeningPhases.svelte';
	import StoryRecap from './StoryRecap.svelte';
	import OverviewTab from './OverviewTab.svelte';
	import TasteTab from './TasteTab.svelte';
	import HabitsTab from './HabitsTab.svelte';
	import CatalogueTab from './CatalogueTab.svelte';
	import PunchcardHeatmap from './PunchcardHeatmap.svelte';
	import EddingtonChart from './EddingtonChart.svelte';
	import Recommendations from './Recommendations.svelte';

	function noiseAvatar(canvas: HTMLCanvasElement, seed: string) {
		renderNoiseAvatar(canvas, seed, { displaySize: 32, gridSize: 5 });
		return {
			update(newSeed: string) {
				renderNoiseAvatar(canvas, newSeed, { displaySize: 32, gridSize: 5 });
			}
		};
	}

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function estimateRemaining(current: number, total: number, elapsedSec: number): string {
		if (current === 0 || elapsedSec === 0) return '—';
		const rate = current / elapsedSec;
		const remaining = Math.ceil((total - current) / rate);
		return formatTime(remaining);
	}

	let { data }: { data: { did: string; handle?: string; pdsUrl?: string; displayName?: string; avatar?: string; error?: string } } = $props();

	// Identity from server load (already resolved — immutable)
	let did = $derived(data.did);
	let handle = $derived(data.handle);
	let pdsUrl = $derived(data.pdsUrl);
	let bskyDisplayName = $derived(data.displayName);
	let bskyAvatar = $derived(data.avatar);

	// Loading phases
	let phase = $state<LoadPhase>('idle');
	let loaded = $state(0);
	let enrichProgress = $state({ current: 0, total: 0 });
    let totalArtistsDiscovered = $state(0);
    let knownArtists = $state(new Set<string>());
	let error = $state('');

	// Timing
	let fetchStartTime = $state(0);
	let enrichStartTime = $state(0);
	let elapsed = $state(0);
	let enrichElapsed = $state(0);

	// Profile data
	let results = $state<ProfileResults>(emptyResults());

	let dateRange = $state<DateRangePreset>('all');

	let profile = $derived(results[dateRange]?.profile ?? null);
	let sessionStats = $derived(results[dateRange]?.sessionStats ?? null);
	let onThisDayEntries = $derived(results[dateRange]?.onThisDay ?? []);
	let storyRecap_ = $derived(results[dateRange]?.storyRecap ?? null);
	let personality = $derived(results[dateRange]?.personality ?? null);

	type Tab = 'overview' | 'taste' | 'habits' | 'catalogue';
	let activeTab = $state<Tab>('overview');

	// Read tab from URL on mount
	const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
	if (urlTab === 'taste' || urlTab === 'habits' || urlTab === 'catalogue') {
		activeTab = urlTab;
	}

	onMount(async () => {
		if (data.error) { error = data.error; phase = 'error'; return; }
		if (!did || !pdsUrl) return;

		const t0 = performance.now();

		try {
			await loadProfile(did, pdsUrl, handle, bskyDisplayName, dateRange as RangeKey, {
				onPhase: (p) => { phase = p; },
				onFetchProgress: (current, elapsedSec) => {
					loaded = current;
					elapsed = elapsedSec;
				},
				onEnrichProgress: (current, total, elapsedSec) => {
					enrichProgress = { current, total };
					enrichElapsed = elapsedSec;
				},
				onResults: (r) => { results = r; }
			});
			console.log(`[tourmaline] complete in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
		} catch (e) {
			phase = 'error';
			error = e instanceof Error ? e.message : String(e);
			console.error('[tourmaline] error:', e);
		}
	});
</script>

<svelte:head>
	<title>{bskyDisplayName ?? handle ?? did} — Tourmaline</title>
	<meta name="description" content="Listening profile for {bskyDisplayName ?? handle ?? did}" />
</svelte:head>

<div class="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
	<header class="mb-6 sm:mb-8">
		<div class="flex items-center gap-3 sm:gap-4">
			{#if bskyAvatar}
				<img src={bskyAvatar} alt="" class="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] sm:h-12 sm:w-12" />
			{/if}
			<div class="min-w-0">
				<h1 class="truncate text-xl font-bold sm:text-2xl">
					{bskyDisplayName ?? handle ?? did}
				</h1>
				{#if bskyDisplayName && handle}
					<p class="truncate text-sm text-[var(--text-muted)]">@{handle}</p>
				{/if}
				{#if did}
					<p class="mt-0.5 truncate font-mono text-xs text-[var(--text-dim)]">{did}</p>
				{/if}
			</div>
		</div>
	</header>

	<!-- ── Loading state (before any profile exists yet) ────────────────────── -->
	{#if phase === 'fetching' || phase === 'idle'}
		<div class="mb-8 grid gap-4">
			<!-- Fetching/Processing Card -->
			<div class="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
				<div class="p-5">
					<div class="flex items-center gap-3">
						<Loader2 size={16} class="shrink-0 animate-spin text-[var(--accent)]" />
						<div class="min-w-0">
							<p class="text-sm font-medium text-[var(--text)]">Fetching scrobbles</p>
							<p class="mt-0.5 text-xs text-[var(--text-dim)]">{loaded.toLocaleString()} loaded</p>
						</div>
					</div>
					<div class="mt-3.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
						<div class="h-full w-1/3 animate-indeterminate rounded-full bg-[var(--accent-dim)]"></div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Background-fill banner: profile is already shown below (with skeleton
	     placeholders growing into real data), this just surfaces progress ──── -->
	{#if (phase === 'computing' || phase === 'enriching') && profile}
		<div class="mb-6 flex items-center gap-2.5 rounded border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 sm:mb-8">
			<Loader2 size={13} class="shrink-0 animate-spin text-[var(--accent)]" />
			<p class="text-xs text-[var(--text-muted)]">
				{phase === 'computing'
					? 'Computing profile…'
					: `Enriching artist data — ${enrichProgress.current.toLocaleString()}/${enrichProgress.total.toLocaleString()}. Genres, mood, and recommendations will keep filling in.`}
			</p>
		</div>
	{/if}

	<!-- ── Error state ────────────────────────────────────────────────────── -->
	{#if phase === 'error'}
		<div class="mb-8 rounded border border-[var(--error)]/40 bg-[var(--error)]/10 p-5">
			<p class="text-sm font-medium text-[var(--error)]">{error}</p>
		</div>
	{/if}

	<!-- ── Empty state ────────────────────────────────────────────────────── -->
	{#if phase === 'complete' && loaded === 0}
		<div class="mb-8 rounded border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
			<p class="text-sm text-[var(--text-muted)]">No scrobbles found for this user.</p>
			<p class="mt-2 text-xs text-[var(--text-dim)]">Make sure the handle is correct and scrobbles are public.</p>
			<a href="/" class="mt-6 inline-block text-sm text-[var(--accent)] hover:underline">Go back</a>
		</div>
	{/if}

	<!-- ── Profile content ────────────────────────────────────────────────── -->
	{#if phase !== 'fetching' && phase !== 'idle' && phase !== 'error' && profile && profile.totalScrobbles > 0}
		<!-- Stats row (always visible) -->
		<div class="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-4 sm:gap-4">
			<div class="flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
				<div class="flex items-center gap-1.5">
					<Music2 size={11} class="text-[var(--text-dim)]" />
					<p class="text-xs text-[var(--text-muted)]">Scrobbles</p>
				</div>
				<p class="text-xl font-bold sm:text-2xl">{profile.totalScrobbles.toLocaleString()}</p>
			</div>
			<div class="flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
				<div class="flex items-center gap-1.5">
					<Users size={11} class="text-[var(--text-dim)]" />
					<p class="text-xs text-[var(--text-muted)]">Unique Artists</p>
				</div>
				<p class="text-xl font-bold sm:text-2xl">{profile.uniqueArtists.toLocaleString()}</p>
			</div>
			<div class="flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
				<div class="flex items-center gap-1.5">
					<LayoutGrid size={11} class="text-[var(--text-dim)]" />
					<p class="text-xs text-[var(--text-muted)]">Diversity</p>
				</div>
				<p class="text-xl font-bold sm:text-2xl">{profile.diversityScore}<span class="text-sm text-[var(--text-muted)]">/100</span></p>
			</div>
			<div class="flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:p-4">
				<div class="flex items-center gap-1.5">
					<Gem size={11} class="text-[var(--text-dim)]" />
					<p class="text-xs text-[var(--text-muted)]">Obscurity</p>
				</div>
				<p class="text-xl font-bold sm:text-2xl">{profile.obscurityIndex}<span class="text-sm text-[var(--text-muted)]">/100</span></p>
			</div>
		</div>

		<!-- Date range picker -->
		<div class="mb-4 flex items-center gap-3 sm:mb-6">
			<DateRangePicker bind:value={dateRange} />
		</div>

		<!-- Tab navigation -->
		<ProfileTabs bind:activeTab />

		<!-- ── Overview tab ─────────────────────────────── -->
		{#if activeTab === 'overview'}
			{#key dateRange}
				{#if storyRecap_}
					<div class="mb-6 sm:mb-8">
						<StoryRecap recap={storyRecap_} />
					</div>
				{/if}
			{/key}

			{#if profile.totalMinutes > 0}
				<div class="mb-6 sm:mb-8">
					<MinutesListened minutes={profile.totalMinutes} />
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
				<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
					<h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Scrobbles per Year</h2>
					<!-- We need to pass the stats to the chart, but profile is ListenerProfile.
					     Let's temporarily create a stats object for the chart from existing data. -->
					<TimelineChart stats={{...profile, years: profile.weeklyScrobbles.reduce<Record<string, number>>((acc, w) => { const year = w.week.slice(0, 4); acc[year] = (acc[year] ?? 0) + w.count; return acc; }, {})} as any} />
				</div>
			{/if}

			{#if profile.topArtists.length > 0}
				<div class="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:mb-8 sm:p-4">
					<h2 class="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Top Artists</h2>
					<TopArtistsChart stats={{seenArtists: Object.fromEntries(profile.topArtists.map(a => [a.name, {scrobbles: Array(a.count).fill(0)}]))} as any} />
				</div>
			{/if}

			{#if personality}
				<div class="mb-8">
					<PersonalityCard profile={profile} displayName={bskyDisplayName ?? handle ?? did} {personality} />
				</div>
			{/if}

			<div class="mt-8">
				<YearlyWrapped profile={profile} displayName={bskyDisplayName ?? handle ?? did} />
			</div>

		<!-- ── Taste tab ─────────────────────────────────── -->
		{:else if activeTab === 'taste'}
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

			<div class="mb-6 sm:mb-8">
				<Recommendations
					recommendations={profile.recommendations}
					loading={phase === 'computing' || phase === 'enriching'}
				/>
			</div>

		<!-- ── Habits tab ────────────────────────────────── -->
		{:else if activeTab === 'habits'}
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

		<!-- ── Catalogue tab ─────────────────────────────── -->
		{:else if activeTab === 'catalogue'}
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
		{/if}
	{/if}
</div>
