export interface Streak {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  length: number;
}

/**
 * Calculates consecutive days of scrobbling from daily counts.
 * Returns all streaks of 2 or more days, sorted by length descending.
 *
 * @param dailyCounts - Map of YYYY-MM-DD to scrobble count
 */
export function calcScrobbleStreaks(
  dailyCounts: Map<string, number>,
): Streak[] {
  const dates = [...dailyCounts.keys()].sort();
  if (dates.length === 0) return [];

  const streaks: Streak[] = [];
  let currentStart = dates[0];
  let currentEnd = dates[0];
  let currentLen = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);

    // Check if consecutive day
    const diff =
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      currentEnd = dates[i];
      currentLen++;
    } else {
      if (currentLen >= 2) {
        streaks.push({
          start: currentStart,
          end: currentEnd,
          length: currentLen,
        });
      }
      currentStart = dates[i];
      currentEnd = dates[i];
      currentLen = 1;
    }
  }

  if (currentLen >= 2) {
    streaks.push({ start: currentStart, end: currentEnd, length: currentLen });
  }

  return streaks.sort((a, b) => b.length - a.length);
}

/**
 * Tracks the longest consecutive streak of a single item (e.g. same artist repeatedly).
 */
export class ItemStreakStack {
  private currentKey: string | null = null;
  private currentLen = 0;
  private bestKey: string | null = null;
  private bestLen = 0;

  push(key: string): void {
    if (key === this.currentKey) {
      this.currentLen++;
    } else {
      this.currentKey = key;
      this.currentLen = 1;
    }

    if (this.currentLen > this.bestLen) {
      this.bestLen = this.currentLen;
      this.bestKey = this.currentKey;
    }
  }

  best(): { key: string; length: number } | null {
    if (!this.bestKey) return null;
    return { key: this.bestKey, length: this.bestLen };
  }
}
