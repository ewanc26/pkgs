import type { AggregatedData } from "./aggregator";

export interface Anniversary {
  artist: string;
  count: number;
  /** Years since the artist's first listen, as of the nearest anniversary date. */
  years: number;
  /** YYYY-MM-DD of the anniversary date itself. */
  date: string;
  /** Signed day offset from today (negative = past, 0 = today, positive = upcoming). */
  daysDiff: number;
}

export interface AnniversaryGroups {
  today: Anniversary[];
  upcoming: Anniversary[];
  past: Anniversary[];
}

const WINDOW_DAYS = 14;
const DAY_MS = 86_400_000;
const TOP_N = 5;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "You discovered [artist] N years ago" — buckets each artist's nearest
 * first-listen anniversary into today/upcoming/past (within a 2-week
 * window), picking whichever of last/this/next year's anniversary date is
 * closest to today. Ranked within each bucket by play count.
 *
 * Ported from lastfm-stats-web's anniversaries$ (general.component.ts).
 */
export function buildAnniversaries(data: AggregatedData): AnniversaryGroups {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayMs = todayStart.getTime();

  const groups: AnniversaryGroups = { today: [], upcoming: [], past: [] };

  for (const [artist, firstListenStr] of data.artistFirstListen) {
    const firstDate = new Date(firstListenStr + "T00:00:00");
    if (isNaN(firstDate.getTime())) continue;

    let best: { date: Date; daysDiff: number; years: number } | null = null;
    for (const offset of [-1, 0, 1]) {
      const anniversaryYear = todayStart.getFullYear() + offset;
      const years = anniversaryYear - firstDate.getFullYear();
      if (years < 1) continue;

      const date = new Date(anniversaryYear, firstDate.getMonth(), firstDate.getDate());
      const daysDiff = Math.round((date.getTime() - todayMs) / DAY_MS);
      if (!best || Math.abs(daysDiff) < Math.abs(best.daysDiff)) {
        best = { date, daysDiff, years };
      }
    }
    if (!best) continue;

    const entry: Anniversary = {
      artist,
      count: data.artistPlayCounts.get(artist) ?? 0,
      years: best.years,
      date: toDateKey(best.date),
      daysDiff: best.daysDiff,
    };

    if (best.daysDiff === 0) groups.today.push(entry);
    else if (best.daysDiff > 0 && best.daysDiff <= WINDOW_DAYS) groups.upcoming.push(entry);
    else if (best.daysDiff < 0 && best.daysDiff >= -WINDOW_DAYS) groups.past.push(entry);
  }

  const byPlayCount = (arr: Anniversary[]) =>
    arr.sort((a, b) => b.count - a.count).slice(0, TOP_N);

  return {
    today: byPlayCount(groups.today),
    upcoming: byPlayCount(groups.upcoming).sort((a, b) => a.daysDiff - b.daysDiff),
    past: byPlayCount(groups.past).sort((a, b) => b.daysDiff - a.daysDiff),
  };
}
