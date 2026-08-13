/**
 * Per-month rank snapshots for every artist, by cumulative play count up
 * to and including that month. Feeds "biggest climbers/fallers" — whose
 * rank improved/worsened most between the two most recent months they
 * both appear in. Ported from lastfm-stats-web's StatsBuilderService rank
 * population + AbstractListsComponent.getRankings().
 *
 * Scoped to artists only (not tracks/albums) — tourmaline doesn't track a
 * monthly per-track/album breakdown the way it does for artists, and
 * artist-level climbers/fallers already covers the highest-value case.
 */
export interface RankSnapshot {
  month: string;
  rank: number;
  cumulativeCount: number;
}

export function buildRankHistory(
  monthlyArtistPlays: Map<string, Map<string, number>>,
): Map<string, RankSnapshot[]> {
  const months = [...monthlyArtistPlays.keys()].sort();
  const cumulative = new Map<string, number>();
  const history = new Map<string, RankSnapshot[]>();

  for (const month of months) {
    const monthPlays = monthlyArtistPlays.get(month)!;
    for (const [artist, count] of monthPlays) {
      cumulative.set(artist, (cumulative.get(artist) ?? 0) + count);
    }

    const ranked = [...cumulative.entries()].sort((a, b) => b[1] - a[1]);
    ranked.forEach(([artist, count], idx) => {
      let hist = history.get(artist);
      if (!hist) {
        hist = [];
        history.set(artist, hist);
      }
      hist.push({ month, rank: idx + 1, cumulativeCount: count });
    });
  }

  return history;
}

export interface RankMover {
  name: string;
  fromRank: number;
  toRank: number;
  delta: number;
}

/**
 * Artists whose rank changed most between the two most recent months in
 * the history (only counting artists present in both). Positive delta =
 * climber (rank number went down, i.e. improved); negative = faller.
 */
export function biggestMovers(
  history: Map<string, RankSnapshot[]>,
  limit: number,
  minCumulativeCount = 5,
): { climbers: RankMover[]; fallers: RankMover[] } {
  const allMonths = new Set<string>();
  for (const entries of history.values()) {
    for (const e of entries) allMonths.add(e.month);
  }
  const months = [...allMonths].sort();
  if (months.length < 2) return { climbers: [], fallers: [] };

  const [prevMonth, currMonth] = months.slice(-2);
  const movers: RankMover[] = [];

  for (const [name, entries] of history) {
    const prev = entries.find((e) => e.month === prevMonth);
    const curr = entries.find((e) => e.month === currMonth);
    if (!prev || !curr) continue;
    if (curr.cumulativeCount < minCumulativeCount) continue;
    const delta = prev.rank - curr.rank;
    if (delta === 0) continue;
    movers.push({ name, fromRank: prev.rank, toRank: curr.rank, delta });
  }

  const climbers = movers
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
  const fallers = movers
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit);

  return { climbers, fallers };
}
