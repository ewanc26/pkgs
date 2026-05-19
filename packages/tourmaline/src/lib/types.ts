import type { ListeningPhase } from "$lib/analysis/phases";

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
  /** Per-month most statistically unusual artist (highest z-score). */
  unusualMonths: UnusualMonth[];
  // ── Ported from lastfm-stats-web ─────────────────────────────────────
  scrobbleMilestones: Milestone[];
  artistMilestones: Milestone[];
  trackMilestones: Milestone[];
  albumMilestones: Milestone[];
  longestNotListenedGap: Gap | null;
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
