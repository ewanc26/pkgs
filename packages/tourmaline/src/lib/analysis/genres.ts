import type { AggregatedData } from "./aggregator";
import type { ArtistInfo, GenreEntry, MonthlyGenre } from "$lib/types";
import GENRE_MAP from "$lib/data/genre-map.json";

/**
 * Top-level genre categories.
 * Order matters for display — listed roughly by commonness.
 */
const CATEGORIES = [
  "Metal",
  "Rock",
  "Pop",
  "Electronic",
  "Hip Hop",
  "Jazz",
  "Classical",
  "Folk",
  "Country",
  "R&B",
  "Blues",
  "Reggae",
  "Latin",
  "World",
  "Soundtrack",
  "New Age",
  "Punk",
  "Singer-Songwriter",
] as const;

type Category = (typeof CATEGORIES)[number];

/**
 * genre-map.json is derived from the voltraco/genres categorized-subset
 * (https://github.com/voltraco/genres), with category remapping to match
 * tourmaline's CATEGORIES. Some entries are manually overridden for accuracy
 * (e.g. Classical, Soundtrack, and Singer-Songwriter are absent from that
 * dataset and are added here).
 *
 * The JSON is the authoritative lookup source. SUFFIX_PATTERNS below serves
 * as a fallback for tags not present in the map.
 */
const MAP = GENRE_MAP as Record<string, Category>;

/**
 * Suffix patterns — fallback for tags that don't appear in genre-map.json.
 * Checked after the JSON lookup. More specific suffixes listed first.
 */
const SUFFIX_PATTERNS: Array<{ suffix: string; category: Category }> = [
  // Metal (most specific first)
  { suffix: "death metal", category: "Metal" },
  { suffix: "black metal", category: "Metal" },
  { suffix: "doom metal", category: "Metal" },
  { suffix: "thrash metal", category: "Metal" },
  { suffix: "power metal", category: "Metal" },
  { suffix: "folk metal", category: "Metal" },
  { suffix: "groove metal", category: "Metal" },
  { suffix: "speed metal", category: "Metal" },
  { suffix: "sludge metal", category: "Metal" },
  { suffix: "stoner metal", category: "Metal" },
  { suffix: "gothic metal", category: "Metal" },
  { suffix: "symphonic metal", category: "Metal" },
  { suffix: "progressive metal", category: "Metal" },
  { suffix: "melodic metal", category: "Metal" },
  { suffix: "nu metal", category: "Metal" },
  { suffix: "alternative metal", category: "Metal" },
  { suffix: "industrial metal", category: "Metal" },
  { suffix: "metal", category: "Metal" },
  { suffix: "core", category: "Metal" }, // metalcore, deathcore, etc.

  // Rock
  { suffix: "rock", category: "Rock" },
  { suffix: "gaze", category: "Rock" }, // shoegaze, blackgaze, etc.
  { suffix: "grunge", category: "Rock" },

  // Punk
  { suffix: "punk", category: "Punk" },

  // Pop
  { suffix: "pop", category: "Pop" },

  // Electronic
  { suffix: "techno", category: "Electronic" },
  { suffix: "house", category: "Electronic" },
  { suffix: "trance", category: "Electronic" },
  { suffix: "step", category: "Electronic" }, // dubstep, etc.
  { suffix: "bass", category: "Electronic" }, // future bass, uk bass

  // Hip Hop
  { suffix: "hop", category: "Hip Hop" },
  { suffix: "rap", category: "Hip Hop" },

  // Jazz
  { suffix: "jazz", category: "Jazz" },

  // Classical
  { suffix: "classical", category: "Classical" },

  // Folk
  { suffix: "folk", category: "Folk" },

  // Country
  { suffix: "country", category: "Country" },
  { suffix: "grass", category: "Country" }, // bluegrass, newgrass

  // Blues
  { suffix: "blues", category: "Blues" },

  // Reggae
  { suffix: "reggae", category: "Reggae" },
  { suffix: "dancehall", category: "Reggae" },

  // Latin
  { suffix: "latin", category: "Latin" },

  // Soundtrack
  { suffix: "soundtrack", category: "Soundtrack" },
  { suffix: "score", category: "Soundtrack" },

  // Singer-Songwriter
  { suffix: "singer-songwriter", category: "Singer-Songwriter" },
];

/**
 * Normalise a raw genre/tag string to a top-level category.
 * Returns null if the tag doesn't match any known pattern.
 */
function normaliseGenre(tag: string): Category | null {
  const lower = tag.toLowerCase().trim();

  // 1. JSON map lookup (primary source)
  if (lower in MAP) return MAP[lower];

  // 2. Suffix pattern fallback
  for (const { suffix, category } of SUFFIX_PATTERNS) {
    if (lower.endsWith(suffix)) return category;
  }

  return null;
}

/**
 * Build the genre profile from aggregated data and enriched artist info.
 * Uses the full artistPlayCounts map (not just top-50) to capture
 * the long tail of less-played genres.
 */
export function buildGenreProfile(
  data: AggregatedData,
  artistInfos: Map<string, ArtistInfo>,
): GenreEntry[] {
  const genreWeights = new Map<Category, number>();
  console.log(`[tourmaline] building genre profile, artistCounts: ${data.artistPlayCounts.size}, artistInfos: ${artistInfos.size}`);

  for (const [name, count] of data.artistPlayCounts) {
    const info = artistInfos.get(name);
    if (!info) {
        console.log(`[tourmaline] artist not in info: ${name}`);
        continue;
    }

    const allRaw = [...info.genres, ...info.tags];
    const seen = new Set<Category>();

    for (const raw of allRaw) {
      const normalised = normaliseGenre(raw);
      if (!normalised || seen.has(normalised)) continue;
      seen.add(normalised);
      genreWeights.set(normalised, (genreWeights.get(normalised) ?? 0) + count);
    }
  }

  const result = [...genreWeights.entries()]
    .map(([name, weight]) => ({ name, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20);
  console.log(`[tourmaline] genre result: ${result.length} genres`);
  return result;
}

/**
 * Build per-month genre distributions using monthlyArtistPlays.
 * Returns months sorted chronologically, each with their top genres.
 */
export function buildMonthlyGenres(
  data: AggregatedData,
  artistInfos: Map<string, ArtistInfo>,
): MonthlyGenre[] {
  const result: MonthlyGenre[] = [];

  for (const [month, artistPlays] of [
    ...data.monthlyArtistPlays.entries(),
  ].sort(([a], [b]) => a.localeCompare(b))) {
    const genreWeights = new Map<string, number>();

    for (const [artistName, count] of artistPlays) {
      const info = artistInfos.get(artistName);
      if (!info) continue;
      const allRaw = [...info.genres, ...info.tags];
      const seen = new Set<string>();
      for (const raw of allRaw) {
        const normalised = normaliseGenre(raw);
        if (!normalised || seen.has(normalised)) continue;
        seen.add(normalised);
        genreWeights.set(
          normalised,
          (genreWeights.get(normalised) ?? 0) + count,
        );
      }
    }

    if (genreWeights.size > 0) {
      result.push({
        month,
        genres: [...genreWeights.entries()]
          .map(([name, weight]) => ({ name, weight }))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 6),
      });
    }
  }

  return result;
}

export { normaliseGenre, CATEGORIES };
export type { Category };
