/**
 * Artists scrobbled in every calendar year of the listener's history —
 * and a variant excluding the first and last year, since those are often
 * partial (you didn't necessarily start listening on Jan 1). Ported from
 * lastfm-stats-web's "every year artists" / "every completed year artists".
 */
function artistYearSets(monthlyArtistPlays: Map<string, Map<string, number>>): Map<string, Set<string>> {
  const artistYears = new Map<string, Set<string>>();
  for (const [month, artists] of monthlyArtistPlays) {
    const year = month.slice(0, 4);
    for (const artist of artists.keys()) {
      let set = artistYears.get(artist);
      if (!set) {
        set = new Set();
        artistYears.set(artist, set);
      }
      set.add(year);
    }
  }
  return artistYears;
}

function filterEveryYear(artistYears: Map<string, Set<string>>, years: string[]): string[] {
  if (years.length === 0) return [];
  return [...artistYears.entries()]
    .filter(([, set]) => years.every((y) => set.has(y)))
    .map(([artist]) => artist);
}

export interface EveryYearResult {
  everyYear: string[];
  everyCompletedYear: string[];
}

export function buildEveryYearArtists(monthlyArtistPlays: Map<string, Map<string, number>>): EveryYearResult {
  const years = [...new Set([...monthlyArtistPlays.keys()].map((m) => m.slice(0, 4)))].sort();
  const artistYears = artistYearSets(monthlyArtistPlays);

  const everyYear = filterEveryYear(artistYears, years);
  // Completed years excludes the first and last (possibly partial) year —
  // only meaningful once there's a middle year to check against.
  const completedYears = years.length > 2 ? years.slice(1, -1) : [];
  const everyCompletedYear = filterEveryYear(artistYears, completedYears);

  return { everyYear, everyCompletedYear };
}
