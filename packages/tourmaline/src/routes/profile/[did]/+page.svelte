<script lang="ts">
	import { onMount } from 'svelte';
	import { renderNoiseAvatar } from '@ewanc26/noise-avatar';
	import { Loader2, Cpu, Sparkles, Music2, Users, LayoutGrid, Gem } from '@lucide/svelte';
	import type { ListenerProfile, TealScrobble, ArtistInfo, UnusualMonth } from '$lib/types';
	import type { SessionStats } from '$lib/analysis/sessions';
	import type { OnThisDayEntry } from '$lib/analysis/on-this-day';
	import type { StoryRecap as StoryRecapData } from '$lib/analysis/story-recap';
	import type { PersonalityProfile } from '$lib/analysis/personality';
	import type { DateRangePreset } from '$lib/analysis/date-range';
	import { Aggregator } from '$lib/analysis/aggregator';
	import { buildGenreProfile, buildMonthlyGenres } from '$lib/analysis/genres';
	import { buildTimeline } from '$lib/analysis/timeline';
	import { diversityScore, calculateGini } from '$lib/analysis/diversity';
	import { calculateObscurity } from '$lib/analysis/obscurity';
	import { buildMoodProfile } from '$lib/analysis/mood';
	import { buildEraProfile } from '$lib/analysis/era';
	import { buildRemarkableDays } from '$lib/analysis/remarkable-days';
	import {
		buildDiscoveredArtists,
		buildDiscoveredTracks,
		buildDiscoveredAlbums
	} from '$lib/analysis/discovery';
	import { buildListeningPhases } from '$lib/analysis/phases';
	import { deriveSessions, buildSessionStats } from '$lib/analysis/sessions';
	import { buildOnThisDay } from '$lib/analysis/on-this-day';
	import { buildStoryRecap } from '$lib/analysis/story-recap';
	import { buildPersonality } from '$lib/analysis/personality';
	import { filterScrobbles, presetRange } from '$lib/analysis/date-range';
	import { topZScorePerMonth } from '$lib/analysis/zscore';
	import GenreChart from './GenreChart.svelte';
	import TimelineHeatmap from './TimelineHeatmap.svelte';
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

	type RangeKey = 'all' | '7d' | '30d' | '90d' | '365d';
	const RANGES: RangeKey[] = ['all', '7d', '30d', '90d', '365d'];

	function computeProfile(
		did: string,
		scrobbles: TealScrobble[],
		range: RangeKey,
		artistInfos: Map<string, ArtistInfo>,
		handle?: string
	): {
		profile: ListenerProfile;
		sessionStats: ReturnType<typeof buildSessionStats>;
		onThisDay: ReturnType<typeof buildOnThisDay>;
		storyRecap: ReturnType<typeof buildStoryRecap>;
		personality: ReturnType<typeof buildPersonality>;
	} {
		const filtered = range === 'all'
			? scrobbles
			: filterScrobbles(scrobbles, presetRange(range));

		const aggregator = new Aggregator();
		aggregator.add(filtered);
		const data = aggregator.snapshot();

		const genres = buildGenreProfile(data, artistInfos);
		const timeline = buildTimeline(data);
		const diversity = diversityScore(data);
		const gini = calculateGini(data);
		const obscurity = calculateObscurity(data, artistInfos);
		const mood = buildMoodProfile(data, artistInfos);
		const era = buildEraProfile(data, artistInfos);
		const monthlyGenres = buildMonthlyGenres(data, artistInfos);
		const remarkableDays = buildRemarkableDays(data);
		const discoveredArtists = buildDiscoveredArtists(data, artistInfos);
		const discoveredTracks = buildDiscoveredTracks(data);
		const discoveredAlbums = buildDiscoveredAlbums(data);
		const phases = buildListeningPhases(data, monthlyGenres, artistInfos);

		const zScoreMap = topZScorePerMonth(data.monthlyArtistPlays);
		const unusualMonths: UnusualMonth[] = [...zScoreMap.entries()]
			.map(([month, entry]) => ({
				month,
				artist: entry.artist,
				plays: entry.plays,
				mean: entry.mean,
				std: entry.std,
				z: entry.z
			}))
			.sort((a, b) => a.month.localeCompare(b.month));

		const topArtistAvgDeltas = [...data.artistTimestamps.entries()]
			.filter(([_, ts]) => ts.length >= 5)
			.map(([name, ts]) => {
				const sorted = [...ts].sort((a, b) => a - b);
				const first = sorted[0];
				const last = sorted[sorted.length - 1];
				const diffMs = last - first;
				const avgMs = diffMs / (ts.length - 1);
				const avgDays = avgMs / (1000 * 60 * 60 * 24);
				return { name, avgDaysBetween: avgDays, count: ts.length };
			})
			.sort((a, b) => a.avgDaysBetween - b.avgDaysBetween)
			.slice(0, 20);

		const profile: ListenerProfile = {
			did,
			handle,
			totalScrobbles: data.totalScrobbles,
			uniqueArtists: data.uniqueArtists,
			uniqueTracks: data.uniqueTracks,
			totalMinutes: data.totalMinutes,
			topArtists: data.topArtists.map((a) => ({
				...a,
				imageUrl: artistInfos.get(a.name)?.imageUrl
			})),
			topTracks: data.topTracks,
			topAlbums: data.topAlbums,
			genres,
			timeline,
			dailyScrobbles: [...data.dailyScrobbles.entries()]
				.map(([date, count]) => ({ date, count }))
				.sort((a, b) => a.date.localeCompare(b.date)),
			era,
			diversityScore: diversity,
			giniCoefficient: gini,
			obscurityIndex: obscurity,
			mood,
			scrobblesByHour: data.scrobblesByHour,
			serviceOrigins: Object.fromEntries(data.serviceOrigins),
			monthlyGenres,
			remarkableDays,
			discoveredArtists,
			discoveredTracks,
			discoveredAlbums,
			phases,
			unusualMonths,
			eddingtonNumber: data.eddingtonNumber,
			longestScrobbleStreak: data.longestScrobbleStreak,
			longestArtistStreak: data.longestArtistStreak,
			longestTrackStreak: data.longestTrackStreak,
			weeklyScrobbles: [...data.weeklyScrobbles.entries()]
				.map(([week, count]) => ({ week, count }))
				.sort((a, b) => a.week.localeCompare(b.week)),
			topArtistAvgDeltas,
			scrobbleMilestones: data.scrobbleMilestones,
			artistMilestones: data.artistMilestones,
			trackMilestones: data.trackMilestones,
			albumMilestones: data.albumMilestones,
			longestNotListenedGap: data.longestNotListenedGap
		};

		const sessions = deriveSessions(filtered);
		const sessionStats = buildSessionStats(sessions);
		const onThisDay = buildOnThisDay(filtered);
		const storyRecap = buildStoryRecap(profile, bskyDisplayName ?? handle ?? did, phases, range);
		const personality = buildPersonality(profile);

		return { profile, sessionStats, onThisDay, storyRecap, personality };
	}

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
	let phase = $state<'idle' | 'fetching' | 'computing' | 'enriching' | 'complete' | 'error'>('idle');
	let loaded = $state(0);
	let enrichProgress = $state({ current: 0, total: 0 });
	let error = $state('');

	// Timing
	let fetchStartTime = $state(0);
	let enrichStartTime = $state(0);
	let elapsed = $state(0);
	let enrichElapsed = $state(0);

	// Profile data
	interface ProfileResult {
		profile: ListenerProfile;
		sessionStats: SessionStats;
		onThisDay: OnThisDayEntry[];
		storyRecap: StoryRecapData;
		personality: PersonalityProfile;
	}

	let results = $state<Record<string, ProfileResult | null>>({
		all: null,
		'7d': null,
		'30d': null,
		'90d': null,
		'365d': null
	});
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

	let dateRange = $state<DateRangePreset>('all');

	onMount(async () => {
		if (data.error) { error = data.error; phase = 'error'; return; }
		if (!did || !pdsUrl) return;

		const t0 = performance.now();

		// Client accumulates scrobbles and runs analysis locally
		const allScrobbles: TealScrobble[] = [];
		let cursor: string | null = null;
		const artistInfos = new Map<string, ArtistInfo>();

		try {
			// 1. Fetch scrobbles in batches (stateless endpoint)
			phase = 'fetching';
			fetchStartTime = Date.now();
			let fetchDone = false;

			const fetchTimer = setInterval(() => {
				elapsed = Math.floor((Date.now() - fetchStartTime) / 1000);
			}, 1000);

			while (!fetchDone) {
				const params = new URLSearchParams({ pdsUrl });
				if (cursor) params.set('cursor', cursor);

				const res = await fetch(`/api/scrobbles/${encodeURIComponent(did)}?${params}`);
				const batch = await res.json();

				if (batch.error) {
					throw new Error(batch.error);
				}

				allScrobbles.push(...batch.scrobbles);
				loaded = allScrobbles.length;
				cursor = batch.cursor;
				fetchDone = batch.done;
			}

			clearInterval(fetchTimer);
			elapsed = Math.floor((Date.now() - fetchStartTime) / 1000);

			if (allScrobbles.length === 0) {
				phase = 'complete';
				return;
			}

			// 2. Compute all profiles client-side (pure functions, no API keys)
			phase = 'computing';

			const initialResults: Record<string, ProfileResult | null> = { ...results };
			for (const range of RANGES) {
				initialResults[range] = computeProfile(did, allScrobbles, range, artistInfos, handle);
			}
			results = initialResults;

			// 3. Enrich top artists server-side (needs API keys)
			const topArtists = results['all']?.profile.topArtists.map((a) => a.name) ?? [];
			if (topArtists.length > 0) {
				phase = 'enriching';
				enrichStartTime = Date.now();
				let enrichQueue = [...topArtists];
				let enrichment: Record<string, ArtistInfo> = {};
				let enrichDone = false;

				const enrichTimer = setInterval(() => {
					enrichElapsed = Math.floor((Date.now() - enrichStartTime) / 1000);
				}, 1000);

				while (!enrichDone) {
					const res = await fetch(`/api/enrich/${encodeURIComponent(did)}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ queue: enrichQueue, enrichment })
					});
					const batch = await res.json();

					if (batch.error) {
						console.warn('[tourmaline] enrichment error:', batch.error);
						break;
					}

					enrichment = batch.enrichment;
					enrichQueue = batch.remaining;
					enrichProgress = { current: batch.current, total: batch.total };
					enrichDone = batch.done;
				}

				clearInterval(enrichTimer);
				enrichElapsed = Math.floor((Date.now() - enrichStartTime) / 1000);

				// Re-compute profiles with enrichment applied
				for (const [name, info] of Object.entries(enrichment)) {
					artistInfos.set(name, info);
				}

				const updatedResults: Record<string, ProfileResult | null> = { ...results };
				for (const range of RANGES) {
					updatedResults[range] = computeProfile(did, allScrobbles, range, artistInfos, handle);
				}
				results = updatedResults;
			}

			phase = 'complete';
			console.log(`[tourmaline] complete in ${((performance.now() - t0) / 1000).toFixed(1)}s — ${loaded} scrobbles`);
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

	<!-- ── Loading state ──────────────────────────────────────────────────── -->
	{#if phase !== 'complete' && phase !== 'error'}
		<div class="mb-8 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
			{#if phase === 'fetching'}
				<div class="p-5">
					<div class="flex items-center gap-3">
						<Loader2 size={16} class="shrink-0 animate-spin text-[var(--accent)]" />
						<div class="min-w-0">
							<p class="text-sm font-medium text-[var(--text)]">Fetching scrobbles</p>
							<p class="mt-0.5 text-xs text-[var(--text-dim)]">
								{loaded.toLocaleString()} loaded
								{#if elapsed > 0}
									· {formatTime(elapsed)} elapsed
									· {loaded > 0 ? (loaded / elapsed).toFixed(0) : '—'}/sec
								{/if}
							</p>
						</div>
					</div>
					<div class="mt-3.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
						<div class="h-full w-1/3 animate-indeterminate rounded-full bg-[var(--accent-dim)]"></div>
					</div>
				</div>
			{:else if phase === 'computing'}
				<div class="p-5">
					<div class="flex items-center gap-3">
						<Cpu size={16} class="shrink-0 animate-pulse text-[var(--accent)]" />
						<div>
							<p class="text-sm font-medium text-[var(--text)]">Computing profile</p>
							<p class="mt-0.5 text-xs text-[var(--text-dim)]">Aggregating {loaded.toLocaleString()} scrobbles…</p>
						</div>
					</div>
					<div class="mt-3.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
						<div class="h-full w-2/3 animate-indeterminate rounded-full bg-[var(--accent-dim)]"></div>
					</div>
				</div>
			{:else if phase === 'enriching'}
				<div class="p-5">
					<div class="flex items-center gap-3">
						<Sparkles size={16} class="shrink-0 animate-pulse text-[var(--accent)]" />
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-[var(--text)]">Enriching artist data</p>
							<p class="mt-0.5 text-xs text-[var(--text-dim)]">
								{enrichProgress.current} / {enrichProgress.total} artists
								{#if enrichElapsed > 0}
									· {formatTime(enrichElapsed)} elapsed
									{#if enrichProgress.current > 0}
										· {estimateRemaining(enrichProgress.current, enrichProgress.total, enrichElapsed)} remaining
									{/if}
								{/if}
							</p>
						</div>
						<span class="shrink-0 font-mono text-xs text-[var(--text-dim)]">
							{enrichProgress.total > 0 ? Math.round((enrichProgress.current / enrichProgress.total) * 100) : 0}%
						</span>
					</div>
					<div class="mt-3.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
						<div
							class="h-full rounded-full bg-[var(--accent-dim)] transition-all duration-300"
							style="width: {enrichProgress.total > 0 ? (enrichProgress.current / enrichProgress.total) * 100 : 0}%"
						></div>
					</div>
				</div>
			{/if}
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
	{#if profile && profile.totalScrobbles > 0}
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
