/**
 * Compares two listener profiles: shared/unique artists and genres, a
 * cosine-similarity compatibility score over each listener's top 50
 * artists and genre weights, and shared discoveries (artists both
 * listeners first heard around the same time).
 *
 * Every teal.fm scrobbler has a public DID and public records on their own
 * PDS, so — unlike Last.fm/Spotify-style "compatibility" features — this
 * needs no account linking on either side: both profiles are just fetched
 * the same way a single profile is.
 */
import type { ListenerProfile } from "$lib/types";

export interface SharedArtist {
  name: string;
  countA: number;
  countB: number;
}

export interface SharedGenre {
  name: string;
  weightA: number;
  weightB: number;
}

export interface UniqueArtist {
  name: string;
  count: number;
}

export interface SharedDiscovery {
  name: string;
  firstListenA: string;
  firstListenB: string;
  /** Absolute days between each listener's first listen. */
  daysApart: number;
}

export interface ComparisonResult {
  /** 0-100. Cosine similarity over top-50 artist play counts (60%) and genre weights (40%). */
  compatibilityScore: number;
  sharedArtists: SharedArtist[];
  sharedGenres: SharedGenre[];
  /** Listener A's top artists that don't appear anywhere in listener B's scrobbles. */
  uniqueToA: UniqueArtist[];
  uniqueToB: UniqueArtist[];
  /** Artists both listeners discovered within 30 days of each other. */
  sharedDiscoveries: SharedDiscovery[];
}

/** Cosine similarity between two name -> weight maps, 0-1. */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let dot = 0;
  for (const [key, valA] of a) {
    const valB = b.get(key);
    if (valB) dot += valA * valB;
  }

  const magA = Math.sqrt([...a.values()].reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt([...b.values()].reduce((sum, v) => sum + v * v, 0));
  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

export function compareProfiles(a: ListenerProfile, b: ListenerProfile): ComparisonResult {
  const artistMapA = new Map(a.topArtists.map((x) => [x.name.toLowerCase(), x.count]));
  const artistMapB = new Map(b.topArtists.map((x) => [x.name.toLowerCase(), x.count]));
  const genreMapA = new Map(a.genres.map((g) => [g.name.toLowerCase(), g.weight]));
  const genreMapB = new Map(b.genres.map((g) => [g.name.toLowerCase(), g.weight]));

  const artistSimilarity = cosineSimilarity(artistMapA, artistMapB);
  const genreSimilarity = cosineSimilarity(genreMapA, genreMapB);
  const compatibilityScore = Math.round(100 * (0.6 * artistSimilarity + 0.4 * genreSimilarity));

  const nameByLowerA = new Map(a.topArtists.map((x) => [x.name.toLowerCase(), x.name]));

  const sharedArtists: SharedArtist[] = [];
  for (const [key, countA] of artistMapA) {
    const countB = artistMapB.get(key);
    if (countB) {
      sharedArtists.push({ name: nameByLowerA.get(key)!, countA, countB });
    }
  }
  sharedArtists.sort((x, y) => y.countA + y.countB - (x.countA + x.countB));

  const genreNameByLowerA = new Map(a.genres.map((g) => [g.name.toLowerCase(), g.name]));
  const sharedGenres: SharedGenre[] = [];
  for (const [key, weightA] of genreMapA) {
    const weightB = genreMapB.get(key);
    if (weightB) {
      sharedGenres.push({ name: genreNameByLowerA.get(key)!, weightA, weightB });
    }
  }
  sharedGenres.sort((x, y) => y.weightA + y.weightB - (x.weightA + x.weightB));

  const knownB = new Set(b.allArtists.map((n) => n.toLowerCase()));
  const knownA = new Set(a.allArtists.map((n) => n.toLowerCase()));

  const uniqueToA: UniqueArtist[] = a.topArtists
    .filter((x) => !knownB.has(x.name.toLowerCase()))
    .slice(0, 15)
    .map((x) => ({ name: x.name, count: x.count }));

  const uniqueToB: UniqueArtist[] = b.topArtists
    .filter((x) => !knownA.has(x.name.toLowerCase()))
    .slice(0, 15)
    .map((x) => ({ name: x.name, count: x.count }));

  const discoveredByA = new Map(a.discoveredArtists.map((d) => [d.name.toLowerCase(), d.firstListen]));
  const sharedDiscoveries: SharedDiscovery[] = [];
  for (const d of b.discoveredArtists) {
    const firstA = discoveredByA.get(d.name.toLowerCase());
    if (!firstA) continue;
    const daysApart = Math.abs(
      (new Date(firstA + "T00:00:00Z").getTime() - new Date(d.firstListen + "T00:00:00Z").getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysApart <= 30) {
      sharedDiscoveries.push({
        name: d.name,
        firstListenA: firstA,
        firstListenB: d.firstListen,
        daysApart: Math.round(daysApart),
      });
    }
  }
  sharedDiscoveries.sort((x, y) => x.daysApart - y.daysApart);

  return {
    compatibilityScore,
    sharedArtists,
    sharedGenres,
    uniqueToA,
    uniqueToB,
    sharedDiscoveries: sharedDiscoveries.slice(0, 15),
  };
}

/** Playful label for a compatibility score, matching the rest of tourmaline's tone. */
export function compatibilityLabel(score: number): string {
  if (score >= 80) return "Practically the same playlist";
  if (score >= 60) return "Strong overlap";
  if (score >= 40) return "Some common ground";
  if (score >= 20) return "Different wavelengths";
  return "Almost no overlap";
}
