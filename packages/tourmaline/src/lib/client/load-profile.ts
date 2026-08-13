/**
 * Shared client-side profile loading: fetch scrobbles from a PDS, compute
 * a ListenerProfile across every date range, and progressively enrich
 * artists via MusicBrainz/Last.fm/Deezer.
 *
 * Extracted from profile/[did]/+page.svelte so the same loading pipeline
 * can be reused by the compare route without duplicating ~150 lines of
 * fetch/compute/enrich orchestration.
 */
import type { ListenerProfile, TealScrobble, ArtistInfo, UnusualMonth } from "$lib/types";
import type { SessionStats } from "$lib/analysis/sessions";
import type { OnThisDayEntry } from "$lib/analysis/on-this-day";
import type { StoryRecap as StoryRecapData } from "$lib/analysis/story-recap";
import type { PersonalityProfile } from "$lib/analysis/personality";
import { Aggregator } from "$lib/analysis/aggregator";
import { buildGenreProfile, buildMonthlyGenres } from "$lib/analysis/genres";
import { buildTimeline } from "$lib/analysis/timeline";
import { diversityScore, calculateGini } from "$lib/analysis/diversity";
import { calculateObscurity } from "$lib/analysis/obscurity";
import { buildMoodProfile } from "$lib/analysis/mood";
import { buildEraProfile } from "$lib/analysis/era";
import { buildRemarkableDays } from "$lib/analysis/remarkable-days";
import {
  buildDiscoveredArtists,
  buildDiscoveredTracks,
  buildDiscoveredAlbums,
} from "$lib/analysis/discovery";
import { buildListeningPhases } from "$lib/analysis/phases";
import { deriveSessions, buildSessionStats } from "$lib/analysis/sessions";
import { buildOnThisDay } from "$lib/analysis/on-this-day";
import { buildStoryRecap } from "$lib/analysis/story-recap";
import { buildPersonality } from "$lib/analysis/personality";
import { filterScrobbles, presetRange } from "$lib/analysis/date-range";
import { topZScorePerMonth } from "$lib/analysis/zscore";
import { buildRecommendations } from "$lib/analysis/recommendations";
import { buildAnniversaries } from "$lib/analysis/anniversaries";

export type RangeKey = "all" | "7d" | "30d" | "90d" | "365d";
export const RANGES: RangeKey[] = ["all", "7d", "30d", "90d", "365d"];

export type LoadPhase = "idle" | "fetching" | "computing" | "enriching" | "complete" | "error";

export interface ProfileResult {
  profile: ListenerProfile;
  sessionStats: SessionStats;
  onThisDay: OnThisDayEntry[];
  storyRecap: StoryRecapData;
  personality: PersonalityProfile;
}

export type ProfileResults = Record<RangeKey, ProfileResult | null>;

export function emptyResults(): ProfileResults {
  return { all: null, "7d": null, "30d": null, "90d": null, "365d": null };
}

/**
 * Compute a full ListenerProfile (and derived views) for one date range from
 * raw scrobbles + whatever artist enrichment is available so far. Pure —
 * safe to call repeatedly as enrichment fills in.
 */
export function computeProfile(
  did: string,
  scrobbles: TealScrobble[],
  range: RangeKey,
  artistInfos: Map<string, ArtistInfo>,
  handle: string | undefined,
  displayName: string | undefined,
): ProfileResult {
  const filtered = range === "all" ? scrobbles : filterScrobbles(scrobbles, presetRange(range));

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
      z: entry.z,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const topArtistAvgDeltas = [...data.artistTimestamps.entries()]
    .filter(([, ts]) => ts.length >= 5)
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

  const topArtistsByWeeksActive = [...data.artistWeeksActive.entries()]
    .filter(([, weeksActive]) => weeksActive >= 2)
    .map(([name, weeksActive]) => ({
      name,
      weeksActive,
      count: data.artistPlayCounts.get(name) ?? 0,
    }))
    .sort((a, b) => b.weeksActive - a.weeksActive)
    .slice(0, 10);

  const profile: ListenerProfile = {
    did,
    handle,
    totalScrobbles: data.totalScrobbles,
    uniqueArtists: data.uniqueArtists,
    uniqueTracks: data.uniqueTracks,
    totalMinutes: data.totalMinutes,
    allArtists: data.allArtists,
    topArtists: data.topArtists.map((a) => ({
      ...a,
      imageUrl: artistInfos.get(a.name)?.imageUrl,
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
    topArtistsByWeeksActive,
    scrobbleMilestones: data.scrobbleMilestones,
    artistMilestones: data.artistMilestones,
    trackMilestones: data.trackMilestones,
    albumMilestones: data.albumMilestones,
    longestNotListenedGap: data.longestNotListenedGap,
    recommendations: buildRecommendations(data.topArtists, data.allArtists, artistInfos),
    anniversaries: buildAnniversaries(data),
  };

  const sessions = deriveSessions(filtered);
  const sessionStats = buildSessionStats(sessions);
  const onThisDay = buildOnThisDay(filtered);
  const storyRecap = buildStoryRecap(profile, displayName ?? handle ?? did, phases, range);
  const personality = buildPersonality(profile);

  return { profile, sessionStats, onThisDay, storyRecap, personality };
}

// ── Artist enrichment cache (localStorage, 30-day TTL) ────────────────
const CACHE_PREFIX = "tm:a:";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

function readArtistCache(name: string): ArtistInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + name);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { info: ArtistInfo; exp: number };
    if (Date.now() > entry.exp) {
      localStorage.removeItem(CACHE_PREFIX + name);
      return null;
    }
    return entry.info;
  } catch {
    return null;
  }
}

function writeArtistCache(name: string, info: ArtistInfo): void {
  try {
    localStorage.setItem(CACHE_PREFIX + name, JSON.stringify({ info, exp: Date.now() + CACHE_TTL }));
  } catch {
    /* storage full or unavailable — silent fail */
  }
}

export interface LoadProfileCallbacks {
  onPhase?: (phase: LoadPhase) => void;
  onFetchProgress?: (loaded: number, elapsedSec: number) => void;
  onEnrichProgress?: (current: number, total: number, elapsedSec: number) => void;
  /** Fired after each enrichment batch (active range only) and once more at the end (all ranges). */
  onResults?: (results: ProfileResults) => void;
}

export interface LoadProfileResult {
  scrobbles: TealScrobble[];
  artistInfos: Map<string, ArtistInfo>;
  results: ProfileResults;
}

/**
 * Fetch every scrobble for `did` from `pdsUrl`, compute profiles for all
 * date ranges, then progressively enrich artists and recompute. Mirrors the
 * loading behaviour previously inlined in profile/[did]/+page.svelte.
 *
 * `activeRange` controls which single range is recomputed after each
 * enrichment batch (cheap); every range is recomputed once at the end.
 */
export async function loadProfile(
  did: string,
  pdsUrl: string,
  handle: string | undefined,
  displayName: string | undefined,
  activeRange: RangeKey,
  callbacks: LoadProfileCallbacks = {},
): Promise<LoadProfileResult> {
  const { onPhase, onFetchProgress, onEnrichProgress, onResults } = callbacks;

  const allScrobbles: TealScrobble[] = [];
  let cursor: string | null = null;
  const artistInfos = new Map<string, ArtistInfo>();
  let results: ProfileResults = emptyResults();

  // 1. Fetch scrobbles
  onPhase?.("fetching");
  const fetchStartTime = Date.now();
  let fetchDone = false;
  const fetchTimer = setInterval(() => {
    onFetchProgress?.(allScrobbles.length, Math.floor((Date.now() - fetchStartTime) / 1000));
  }, 1000);

  try {
    while (!fetchDone) {
      const params = new URLSearchParams({ pdsUrl });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/scrobbles/${encodeURIComponent(did)}?${params}`);
      const batch = await res.json();

      if (batch.error) throw new Error(batch.error);

      allScrobbles.push(...batch.scrobbles);
      onFetchProgress?.(allScrobbles.length, Math.floor((Date.now() - fetchStartTime) / 1000));
      cursor = batch.cursor;
      fetchDone = batch.done;
    }
  } finally {
    clearInterval(fetchTimer);
  }

  if (allScrobbles.length === 0) {
    onPhase?.("complete");
    return { scrobbles: allScrobbles, artistInfos, results };
  }

  // 2. Compute profiles
  onPhase?.("computing");
  const initialResults: ProfileResults = { ...results };
  for (const range of RANGES) {
    initialResults[range] = computeProfile(did, allScrobbles, range, artistInfos, handle, displayName);
  }
  results = initialResults;
  onResults?.(results);

  // 3. Enrich artists
  onPhase?.("enriching");
  const enrichStartTime = Date.now();
  const uniqueArtists = Array.from(new Set(allScrobbles.flatMap((s) => s.artists.map((a) => a.name))));

  // Pre-populate from localStorage — artists seen before skip the API entirely.
  for (const name of uniqueArtists) {
    const cached = readArtistCache(name);
    if (cached) artistInfos.set(name, cached);
  }

  let enrichQueue = uniqueArtists.filter((name) => !artistInfos.has(name));
  let enrichment: Record<string, ArtistInfo> = {};
  onEnrichProgress?.(artistInfos.size, uniqueArtists.length, 0);
  let enrichDone = enrichQueue.length === 0;

  const enrichTimer = setInterval(() => {
    onEnrichProgress?.(artistInfos.size, uniqueArtists.length, Math.floor((Date.now() - enrichStartTime) / 1000));
  }, 1000);

  try {
    while (!enrichDone) {
      const queue = enrichQueue.splice(0, 5);
      if (queue.length === 0) {
        enrichDone = true;
        continue;
      }

      const enrichRes = await fetch(`/api/enrich/${encodeURIComponent(did)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue, enrichment }),
      });
      const enrichBatch = await enrichRes.json();

      if (enrichBatch.error) {
        console.warn("[tourmaline] enrichment error:", enrichBatch.error);
        break;
      }

      enrichment = enrichBatch.enrichment;

      for (const [name, info] of Object.entries(enrichBatch.enrichment)) {
        artistInfos.set(name, info as ArtistInfo);
        writeArtistCache(name, info as ArtistInfo);
      }

      onEnrichProgress?.(artistInfos.size, uniqueArtists.length, Math.floor((Date.now() - enrichStartTime) / 1000));

      // Only recompute the active range mid-enrichment — recomputing all 5
      // ranges on every batch is expensive for large scrobble sets.
      const midResults = { ...results };
      midResults[activeRange] = computeProfile(did, allScrobbles, activeRange, artistInfos, handle, displayName);
      results = midResults;
      onResults?.(results);
    }
  } finally {
    clearInterval(enrichTimer);
  }

  // Full recompute of all ranges now that enrichment is complete.
  const finalResults: ProfileResults = { ...results };
  for (const range of RANGES) {
    finalResults[range] = computeProfile(did, allScrobbles, range, artistInfos, handle, displayName);
  }
  results = finalResults;
  onResults?.(results);

  onPhase?.("complete");
  return { scrobbles: allScrobbles, artistInfos, results };
}
