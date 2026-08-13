/**
 * Longest gap between two consecutive listens of the same item — distinct
 * from average delta (topArtistAvgDeltas), which is the *mean* spacing:
 * this surfaces the single biggest silence for an artist/track you
 * otherwise listen to regularly. Ported from lastfm-stats-web's
 * "gaps between X" lists.
 */
export interface GapEntry {
  key: string;
  gapDays: number;
  count: number;
}

/** Longest gap (ms) between two consecutive timestamps in a sorted array. */
export function longestGapMs(timestamps: number[]): number {
  let max = 0;
  for (let i = 1; i < timestamps.length; i++) {
    max = Math.max(max, timestamps[i] - timestamps[i - 1]);
  }
  return max;
}

/**
 * Top items ranked by their longest internal gap between listens. Filters
 * to items with at least `minPlays` occurrences so a barely-played item
 * with one big gap doesn't dominate the list.
 */
export function topGaps(
  timestampsByKey: Map<string, number[]>,
  playCounts: Map<string, number>,
  minPlays: number,
  limit: number,
): GapEntry[] {
  const entries: GapEntry[] = [];
  for (const [key, timestamps] of timestampsByKey) {
    if (timestamps.length < minPlays) continue;
    const gapMs = longestGapMs(timestamps);
    if (gapMs <= 0) continue;
    entries.push({ key, gapDays: gapMs / 86_400_000, count: playCounts.get(key) ?? timestamps.length });
  }
  return entries.sort((a, b) => b.gapDays - a.gapDays).slice(0, limit);
}
