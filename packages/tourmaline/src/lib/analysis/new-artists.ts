/** Month with the most brand-new (first-ever) artists discovered. */
export interface NewArtistMonthStat {
  month: string;
  count: number;
}

export function mostNewArtistsMonth(artistFirstListen: Map<string, string>): NewArtistMonthStat | null {
  const counts = new Map<string, number>();
  for (const dateStr of artistFirstListen.values()) {
    const month = dateStr.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  let best: NewArtistMonthStat | null = null;
  for (const [month, count] of counts) {
    if (!best || count > best.count) best = { month, count };
  }
  return best;
}

/** The newly-discovered artist with the highest play count in their own discovery month. */
export interface MostListenedNewArtist {
  name: string;
  month: string;
  plays: number;
}

export function mostListenedNewArtistInMonth(
  artistFirstListen: Map<string, string>,
  monthlyArtistPlays: Map<string, Map<string, number>>,
): MostListenedNewArtist | null {
  let best: MostListenedNewArtist | null = null;
  for (const [name, dateStr] of artistFirstListen) {
    const month = dateStr.slice(0, 7);
    const plays = monthlyArtistPlays.get(month)?.get(name) ?? 0;
    if (!best || plays > best.plays) best = { name, month, plays };
  }
  return best;
}
