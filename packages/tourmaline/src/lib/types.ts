import type { ListeningPhase } from "$lib/analysis/phases";
import type { Recommendation } from "$lib/analysis/recommendations";
import type { AnniversaryGroups } from "$lib/analysis/anniversaries";
import type { RankMover, RankSnapshot } from "$lib/analysis/rank-history";
import type { NewArtistMonthStat, MostListenedNewArtist } from "$lib/analysis/new-artists";
import type { TagsProfile } from "$lib/analysis/tags-breakdown";
import type { RegionProfile } from "$lib/analysis/region-breakdown";

export interface TealScrobble {
  trackName: string;
  artists: Array<{ name: string; mbId?: string }>;
  releaseName?: string;
  trackMbId?: string;
  recordingMbId?: string;
  releaseMbId?: string;
  duration?: number;
  originUrl?: string;
  playedTime: string;
  submissionClientAgent?: string;
  musicServiceBaseDomain?: string;
  trackDiscriminant?: string;
  releaseDiscriminant?: string;
  /** Internal pagination metadata, removed before analytics run. */
  _tourmalineRecordKey?: string;
  _tourmalineCollection?: "legacy" | "stable";
}

export interface ArtistInfo {
  name: string;
  mbId?: string;
  genres: string[];
  tags: string[];
  similar: Array<{ name: string; mbId?: string }>;
  listenerCount?: number;
  playCount?: number;
  imageUrl?: string;
  startYear?: number;
  /** MusicBrainz area (country/region of origin), e.g. "United States". */
  area?: string;
  /** ISO 3166-1 alpha-2 code for `area`, e.g. "US". */
  areaCode?: string;
}

export interface GenreEntry {
  name: string;
  weight: number;
}

export interface TimelineBucket {
  hour: number;
  day: number;
  count: number;
}

export interface DailyScrobble {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface EraEntry {
  decade: string;
  count: number;
}

export interface MonthlyGenre {
  month: string; // YYYY-MM
  genres: GenreEntry[];
}

export interface RemarkableDay {
  date: string;
  type: "biggest" | "discovery" | "nostalgic" | "artist" | "genre" | "unusual";
  title: string;
  detail: string;
  count: number;
}

export interface DiscoveredArtist {
  name: string;
  firstListen: string; // YYYY-MM-DD
  count: number;
  imageUrl?: string;
}

export interface DiscoveredItem {
  name: string;
  artist: string;
  firstListen: string; // YYYY-MM-DD
  count: number;
}

export interface Milestone {
  count: number;
  scrobble: TealScrobble;
}

export interface Gap {
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  durationMs: number;
}

export interface ListenerProfile {
  did: string;
  handle?: string;
  totalScrobbles: number;
  uniqueArtists: number;
  uniqueTracks: number;
  allArtists: string[];
  totalMinutes: number;
  topArtists: Array<{ name: string; count: number; imageUrl?: string }>;
  topTracks: Array<{ name: string; artist: string; count: number }>;
  topAlbums: Array<{ name: string; artist: string; count: number }>;
  genres: GenreEntry[];
  timeline: TimelineBucket[];
  dailyScrobbles: DailyScrobble[];
  era: EraEntry[];
  diversityScore: number;
  giniCoefficient: number;
  obscurityIndex: number;
  mood: Record<string, number>;
  scrobblesByHour: number[];
  serviceOrigins: Record<string, number>;
  monthlyGenres: MonthlyGenre[];
  remarkableDays: RemarkableDay[];
  discoveredArtists: DiscoveredArtist[];
  discoveredTracks: DiscoveredItem[];
  discoveredAlbums: DiscoveredItem[];
  phases: ListeningPhase[];

  // ── New fields ─────────────────────────────────────────────────────
  eddingtonNumber: number;
  daysToNextEddington: number;
  artistCutoverPoint: number;
  bestArtistDay: { date: string; artist: string; count: number } | null;
  longestScrobbleStreak: { start: string; end: string; length: number } | null;
  longestArtistStreak: { artist: string; length: number } | null;
  longestTrackStreak: { track: string; artist: string; length: number } | null;
  weeklyScrobbles: Array<{ week: string; count: number }>;
  /** Top 20 artists sorted by average days between listens (ascending). */
  topArtistAvgDeltas: Array<{
    name: string;
    avgDaysBetween: number;
    count: number;
  }>;
  /** Top 10 artists by distinct weeks active — favourites returned to over a long span, not just a heavy binge. */
  topArtistsByWeeksActive: Array<{ name: string; weeksActive: number; count: number }>;
  /** Top 10 artists/tracks by longest gap between two consecutive listens (min 5 plays). */
  topArtistGaps: Array<{ name: string; gapDays: number; count: number }>;
  topTrackGaps: Array<{ name: string; artist: string; gapDays: number; count: number }>;
  /** Top 10 artists by distinct tracks played — breadth within one artist's catalogue. */
  topArtistsByTrackCount: Array<{ name: string; trackCount: number; count: number }>;
  /** Top 10 artists by earliest/latest average listen date (min 5 plays). */
  goldenOldieArtists: Array<{ name: string; avgDate: string; count: number }>;
  latestDiscoveryArtists: Array<{ name: string; avgDate: string; count: number }>;
  /** Artists whose rank (by cumulative play count) moved most between the two most recent months. */
  biggestClimbers: RankMover[];
  biggestFallers: RankMover[];
  mostNewArtistsInAMonth: NewArtistMonthStat | null;
  mostListenedNewArtist: MostListenedNewArtist | null;
  /** Artists scrobbled in every calendar year of the listener's history, ranked by play count. */
  everyYearArtists: Array<{ name: string; count: number }>;
  /** Same, excluding the first and last (possibly partial) year. */
  everyCompletedYearArtists: Array<{ name: string; count: number }>;
  /** Per-month most statistically unusual artist (highest z-score). */
  unusualMonths: UnusualMonth[];
  // ── Ported from lastfm-stats-web ─────────────────────────────────────
  scrobbleMilestones: Milestone[];
  artistMilestones: Milestone[];
  trackMilestones: Milestone[];
  albumMilestones: Milestone[];
  longestNotListenedGap: Gap | null;
  recommendations: Recommendation[];
  anniversaries: AnniversaryGroups;
  daysScrobbled: number;
  daysScrobbledPercentage: number;
  oneHitWondersCount: number;
  oneHitWondersPercentage: number;
  mostPopularYear: { year: string; count: number };
  mostPopularMonth: { month: string; count: number };
  tracksWithoutAlbumCount: number;
  tracksWithoutAlbumPercentage: number;
  scrobblesWithoutAlbumCount: number;
  scrobblesWithoutAlbumPercentage: number;
  /** YYYY-MM -> (artist name -> play count that month), as entries for serialisability. For cumulative/race-style charts. */
  monthlyArtistPlays: Array<[string, Array<[string, number]>]>;
  /** Full per-artist rank-by-month history (not just the top movers) — for a per-artist rank-over-time chart. */
  artistRankHistory: Array<[string, RankSnapshot[]]>;
  /** Raw genre/tag strings (not normalised into top-level categories, unlike `genres`) ranked by scrobble count and by distinct-artist count. */
  tagsBreakdown: TagsProfile;
  /** Artists' MusicBrainz area (country/region of origin) ranked by scrobble count and by distinct-artist count. Only covers enriched artists with a resolved area. */
  regionBreakdown: RegionProfile;
}

export interface UnusualMonth {
  /** YYYY-MM */
  month: string;
  artist: string;
  plays: number;
  /** Running mean up to and including this month. */
  mean: number;
  /** Running population std dev. */
  std: number;
  z: number;
}

export interface CacheEntry {
  key: string;
  source: string;
  data: string;
  createdAt: number;
  expiresAt: number;
}
