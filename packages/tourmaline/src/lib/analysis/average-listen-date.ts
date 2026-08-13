/**
 * "Golden oldies" (earliest average listen date — long-time favourites) vs
 * "Latest discoveries" (most recent average listen date) — ranks items by
 * the mean of every timestamp they've been played at, not just when they
 * were first heard. An artist first heard years ago but rarely revisited
 * since won't rank as a golden oldie; one you've listened to steadily the
 * whole time will. Ported from lastfm-stats-web's avgScrobble ranking.
 */
export interface AvgDateEntry {
  key: string;
  avgTimestamp: number;
  count: number;
}

export function topByAvgDate(
  timestampsByKey: Map<string, number[]>,
  playCounts: Map<string, number>,
  minPlays: number,
  limit: number,
  order: "oldest" | "newest",
): AvgDateEntry[] {
  const entries: AvgDateEntry[] = [];
  for (const [key, timestamps] of timestampsByKey) {
    if (timestamps.length < minPlays) continue;
    const avgTimestamp = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
    entries.push({ key, avgTimestamp, count: playCounts.get(key) ?? timestamps.length });
  }
  entries.sort((a, b) =>
    order === "oldest" ? a.avgTimestamp - b.avgTimestamp : b.avgTimestamp - a.avgTimestamp,
  );
  return entries.slice(0, limit);
}
