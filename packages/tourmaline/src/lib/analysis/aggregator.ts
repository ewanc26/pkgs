import type { TealScrobble, Milestone, Gap } from "$lib/types";
import { calcEddington } from "./eddington";
import { calcScrobbleStreaks, ItemStreakStack, type Streak } from "./streaks";

export interface AggregatedData {
  totalScrobbles: number;
  totalMinutes: number;
  uniqueArtists: number;
  uniqueTracks: number;
  topArtists: Array<{ name: string; count: number }>;
  topTracks: Array<{ name: string; artist: string; count: number }>;
  topAlbums: Array<{ name: string; artist: string; count: number }>;
  artistPlayCounts: Map<string, number>;
  trackPlayCounts: Map<string, number>;
  albumPlayCounts: Map<string, { name: string; artist: string; count: number }>;
  scrobblesByHour: number[];
  scrobblesByDay: number[];
  scrobblesByHourDay: number[][];
  dailyScrobbles: Map<string, number>; // YYYY-MM-DD → count
  monthlyScrobbles: Map<string, number>; // YYYY-MM → count
  serviceOrigins: Map<string, number>;
  artistFirstListen: Map<string, string>; // artist → earliest YYYY-MM-DD
  trackFirstListen: Map<string, string>; // trackKey → earliest YYYY-MM-DD
  albumFirstListen: Map<string, string>; // albumKey → earliest YYYY-MM-DD
  /** YYYY-MM → (artist name → play count that month) */
  monthlyArtistPlays: Map<string, Map<string, number>>;
  /** ISO week key (YYYY-WNN) → scrobble count */
  weeklyScrobbles: Map<string, number>;
  /** Sorted per-artist timestamp arrays (ms since epoch) for delta analysis */
  artistTimestamps: Map<string, number[]>;
  // ── Derived stats computed in snapshot() ──────────────────────────────
  eddingtonNumber: number;
  /** All scrobble streaks, sorted by length descending. Streaks < 2 days omitted. */
  scrobbleStreaks: Streak[];
  longestScrobbleStreak: Streak | null;
  longestArtistStreak: { artist: string; length: number } | null;
  longestTrackStreak: { track: string; artist: string; length: number } | null;
  // ── Ported from lastfm-stats-web ─────────────────────────────────────
  scrobbleMilestones: Milestone[];
  artistMilestones: Milestone[];
  trackMilestones: Milestone[];
  albumMilestones: Milestone[];
  longestNotListenedGap: Gap | null;
}

const TRACK_KEY = (s: TealScrobble) =>
  `${s.trackName}|||${s.artists.map((a) => a.name).join(",")}`;
const ALBUM_KEY = (s: TealScrobble) =>
  s.releaseName
    ? `${s.releaseName}|||${s.artists.map((a) => a.name).join(",")}`
    : null;

/**
 * Normalise a scrobble's duration field to seconds.
 *
 * The fm.teal.alpha.feed.play lexicon defines `duration` as seconds,
 * but some scrobbling clients store milliseconds instead. A value
 * above 10 000 (≈ 2.7 hours) is almost certainly in milliseconds —
 * even the longest classical pieces rarely exceed 3 600 seconds.
 *
 * Returns 210 (3.5 minutes) as a fallback when absent.
 */
function normaliseDuration(raw: number | undefined): number {
  if (raw === undefined || raw === null) return 210;
  // Detect milliseconds: > 10 000 seconds is unreasonable for a single track
  if (raw > 10000) return Math.round(raw / 1000);
  // Cap at 1 hour — anything higher is noise
  return Math.min(raw, 3600);
}

/**
 * Returns the ISO 8601 week key for a date, e.g. "2024-W03".
 * Monday is the first day of the week (ISO standard).
 */
function isoWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay() || 7; // Sun=0 → 7 so Mon=1
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Incremental aggregator. Maintains running totals so it can be updated
 * as each batch of scrobbles arrives without reprocessing everything.
 */
export class Aggregator {
  private artistCounts = new Map<string, number>();
  private trackCounts = new Map<
    string,
    { name: string; artist: string; count: number }
  >();
  private albumCounts = new Map<
    string,
    { name: string; artist: string; count: number }
  >();
  private serviceOrigins = new Map<string, number>();
  private byHour = new Array(24).fill(0) as number[];
  private byDay = new Array(7).fill(0) as number[];
  private byHourDay = Array.from(
    { length: 7 },
    () => new Array(24).fill(0) as number[],
  );
  private dailyCounts = new Map<string, number>();
  private monthlyCounts = new Map<string, number>();
  private monthlyArtistCounts = new Map<string, Map<string, number>>();
  private firstListenMap = new Map<string, string>(); // artist → earliest YYYY-MM-DD
  private trackFirstListen = new Map<string, string>(); // trackKey → earliest YYYY-MM-DD
  private albumFirstListen = new Map<string, string>(); // albumKey → earliest YYYY-MM-DD
  private minutesCount = 0;
  private total = 0;
  // ── New tracking fields ─────────────────────────────────────────────────────
  private weeklyCounts = new Map<string, number>();
  private artistTimestamps = new Map<string, number[]>();
  private artistStreak = new ItemStreakStack();
  private trackStreak = new ItemStreakStack();

  // ── Ported tracking fields ────────────────────────────────────────────────
  private scrobbleMilestones: Milestone[] = [];
  private artistMilestones: Milestone[] = [];
  private trackMilestones: Milestone[] = [];
  private albumMilestones: Milestone[] = [];
  private lastScrobble: TealScrobble | null = null;
  private longestGap: Gap | null = null;

  add(scrobbles: TealScrobble[]): void {
    for (const scrobble of scrobbles) {
      // Validate timestamp first — malformed scrobbles are discarded entirely
      const date = new Date(scrobble.playedTime);
      if (isNaN(date.getTime())) continue;

      this.total++;

      // Gap analysis (assumes chronological input)
      if (this.lastScrobble) {
        const lastDate = new Date(this.lastScrobble.playedTime);
        const diff = date.getTime() - lastDate.getTime();
        if (!this.longestGap || diff > this.longestGap.durationMs) {
          this.longestGap = {
            start: this.lastScrobble.playedTime,
            end: scrobble.playedTime,
            durationMs: diff,
          };
        }
      }
      this.lastScrobble = scrobble;

      // Scrobble milestones (every 1000th)
      if (this.total % 1000 === 0) {
        this.scrobbleMilestones.push({ count: this.total, scrobble });
      }

      const artistName = scrobble.artists[0]?.name ?? "Unknown";
      const artistPrevCount = this.artistCounts.get(artistName) ?? 0;
      this.artistCounts.set(artistName, artistPrevCount + 1);

      // Artist milestones (every 100th unique artist)
      if (artistPrevCount === 0) {
        if (this.artistCounts.size % 100 === 0) {
          this.artistMilestones.push({
            count: this.artistCounts.size,
            scrobble,
          });
        }
      }

      // Per-artist timestamp list for average-delta analysis
      const artistTs = this.artistTimestamps.get(artistName);
      if (artistTs) artistTs.push(date.getTime());
      else this.artistTimestamps.set(artistName, [date.getTime()]);

      const trackKey = TRACK_KEY(scrobble);
      const existing = this.trackCounts.get(trackKey);
      if (existing) {
        existing.count++;
      } else {
        this.trackCounts.set(trackKey, {
          name: scrobble.trackName,
          artist: artistName,
          count: 1,
        });
        // Track milestones (every 500th unique track)
        if (this.trackCounts.size % 500 === 0) {
          this.trackMilestones.push({ count: this.trackCounts.size, scrobble });
        }
      }

      const albumKey = ALBUM_KEY(scrobble);
      if (albumKey) {
        const albumExisting = this.albumCounts.get(albumKey);
        if (albumExisting) {
          albumExisting.count++;
        } else {
          this.albumCounts.set(albumKey, {
            name: scrobble.releaseName!,
            artist: artistName,
            count: 1,
          });
          // Album milestones (every 250th unique album)
          if (this.albumCounts.size % 250 === 0) {
            this.albumMilestones.push({
              count: this.albumCounts.size,
              scrobble,
            });
          }
        }
      }

      // Duration (normalised to seconds → minutes; default 3.5 min if absent)
      this.minutesCount += normaliseDuration(scrobble.duration) / 60;
      const hour = date.getHours();
      const day = date.getDay();
      this.byHour[hour]++;
      this.byDay[day]++;
      this.byHourDay[day][hour]++;

      const Y = date.getFullYear();
      const M = String(date.getMonth() + 1).padStart(2, "0");
      const D = String(date.getDate()).padStart(2, "0");
      const dateKey = `${Y}-${M}-${D}`; // Local YYYY-MM-DD
      this.dailyCounts.set(dateKey, (this.dailyCounts.get(dateKey) ?? 0) + 1);

      const monthKey = `${Y}-${M}`; // Local YYYY-MM
      this.monthlyCounts.set(
        monthKey,
        (this.monthlyCounts.get(monthKey) ?? 0) + 1,
      );

      const weekKey = isoWeekKey(date);
      this.weeklyCounts.set(weekKey, (this.weeklyCounts.get(weekKey) ?? 0) + 1);

      // Monthly artist plays
      let monthArtists = this.monthlyArtistCounts.get(monthKey);
      if (!monthArtists) {
        monthArtists = new Map<string, number>();
        this.monthlyArtistCounts.set(monthKey, monthArtists);
      }
      monthArtists.set(artistName, (monthArtists.get(artistName) ?? 0) + 1);

      // First listen per artist (keep the earliest date)
      const prevFirstListen = this.firstListenMap.get(artistName);
      if (!prevFirstListen || dateKey < prevFirstListen) {
        this.firstListenMap.set(artistName, dateKey);
      }

      // First listen per track
      const prevTrackFirst = this.trackFirstListen.get(trackKey);
      if (!prevTrackFirst || dateKey < prevTrackFirst) {
        this.trackFirstListen.set(trackKey, dateKey);
      }

      // First listen per album
      if (albumKey) {
        const prevAlbumFirst = this.albumFirstListen.get(albumKey);
        if (!prevAlbumFirst || dateKey < prevAlbumFirst) {
          this.albumFirstListen.set(albumKey, dateKey);
        }
      }

      if (scrobble.musicServiceBaseDomain) {
        const domain = scrobble.musicServiceBaseDomain;
        this.serviceOrigins.set(
          domain,
          (this.serviceOrigins.get(domain) ?? 0) + 1,
        );
      }

      // Consecutive-item streak tracking (assumes roughly chronological input)
      this.artistStreak.push(artistName);
      this.trackStreak.push(trackKey);
    }
  }

  snapshot(): AggregatedData {
    const topArtists = [...this.artistCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const topTracks = [...this.trackCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const topAlbums = [...this.albumCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // ── Derived stats ─────────────────────────────────────────────────────
    const eddingtonNumber = calcEddington(this.dailyCounts);

    const scrobbleStreaks = calcScrobbleStreaks(this.dailyCounts);
    const longestScrobbleStreak = scrobbleStreaks[0] ?? null;

    const artistBest = this.artistStreak.best();
    const longestArtistStreak = artistBest
      ? { artist: artistBest.key, length: artistBest.length }
      : null;

    const trackBest = this.trackStreak.best();
    let longestTrackStreak: {
      track: string;
      artist: string;
      length: number;
    } | null = null;
    if (trackBest) {
      // Key format: "trackName|||artist1,artist2"
      const sepIdx = trackBest.key.indexOf("|||");
      const trackName =
        sepIdx >= 0 ? trackBest.key.slice(0, sepIdx) : trackBest.key;
      const artistStr = sepIdx >= 0 ? trackBest.key.slice(sepIdx + 3) : "";
      const artistName = artistStr.split(",")[0] ?? "";
      longestTrackStreak = {
        track: trackName,
        artist: artistName,
        length: trackBest.length,
      };
    }

    return {
      totalScrobbles: this.total,
      totalMinutes: Math.round(this.minutesCount),
      uniqueArtists: this.artistCounts.size,
      uniqueTracks: this.trackCounts.size,
      topArtists,
      topTracks,
      topAlbums,
      artistPlayCounts: this.artistCounts,
      trackPlayCounts: new Map(
        [...this.trackCounts.values()].map((t) => [t.name, t.count]),
      ),
      albumPlayCounts: this.albumCounts,
      scrobblesByHour: [...this.byHour],
      scrobblesByDay: [...this.byDay],
      scrobblesByHourDay: this.byHourDay.map((d) => [...d]),
      dailyScrobbles: new Map(this.dailyCounts),
      monthlyScrobbles: new Map(this.monthlyCounts),
      artistFirstListen: this.firstListenMap,
      trackFirstListen: this.trackFirstListen,
      albumFirstListen: this.albumFirstListen,
      monthlyArtistPlays: this.monthlyArtistCounts,
      weeklyScrobbles: new Map(this.weeklyCounts),
      artistTimestamps: this.artistTimestamps,
      eddingtonNumber,
      scrobbleStreaks,
      longestScrobbleStreak,
      longestArtistStreak,
      longestTrackStreak,
      serviceOrigins: this.serviceOrigins,
      scrobbleMilestones: this.scrobbleMilestones,
      artistMilestones: this.artistMilestones,
      trackMilestones: this.trackMilestones,
      albumMilestones: this.albumMilestones,
      longestNotListenedGap: this.longestGap,
    };
  }
}

/** One-shot aggregation for when you have all scrobbles already. */
export function aggregate(scrobbles: TealScrobble[]): AggregatedData {
  const agg = new Aggregator();
  agg.add(scrobbles);
  return agg.snapshot();
}
