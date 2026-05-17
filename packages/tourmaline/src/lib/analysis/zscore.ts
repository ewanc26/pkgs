/**
 * Z-Score analysis — adapted from lastfm-stats-web's ZScoreService.
 *
 * For each month, finds the artist whose play count was most statistically
 * unusual (highest positive z-score) relative to their own personal history,
 * using the Welford online algorithm for numerically stable mean/variance.
 *
 * Ported from: projects/shared/src/lib/service/zscore.service.ts
 */

export interface ZScoreEntry {
  /** Artist name. */
  artist: string;
  /** Raw plays in this month. */
  plays: number;
  /** Running mean up to and including this month. */
  mean: number;
  /** Running population std dev up to and including this month. */
  std: number;
  /** Z-score: (plays - mean) / std. 0 if fewer than 2 months of history. */
  z: number;
  /** Number of months of history used for this calculation. */
  monthCount: number;
}

interface WelfordState {
  count: number;
  mean: number;
  M2: number;
  firstMonthIndex: number;
}

/**
 * Compute per-month z-scores for every artist.
 *
 * @param monthlyArtistPlays - Map<YYYY-MM, Map<artistName, count>>
 *   Keys should be in chronological order (as produced by Aggregator).
 * @returns Map<YYYY-MM, ZScoreEntry[]> — per month, all artists sorted by
 *   z descending. Only months where at least one positive z-score exists
 *   are included in the result.
 */
export function computeZScores(
  monthlyArtistPlays: Map<string, Map<string, number>>,
): Map<string, ZScoreEntry[]> {
  const result = new Map<string, ZScoreEntry[]>();
  // Sort keys so months are always chronological
  const months = [...monthlyArtistPlays.keys()].sort();
  if (months.length < 2) return result;

  // Collect every artist seen across all months
  const allArtists = new Set<string>();
  for (const plays of monthlyArtistPlays.values()) {
    for (const artist of plays.keys()) allArtists.add(artist);
  }

  // Find first month index each artist appeared in
  const firstMonthIdx = new Map<string, number>();
  for (const artist of allArtists) {
    for (let i = 0; i < months.length; i++) {
      if ((monthlyArtistPlays.get(months[i])?.get(artist) ?? 0) > 0) {
        firstMonthIdx.set(artist, i);
        break;
      }
    }
  }

  // Initialise Welford state per artist
  const states = new Map<string, WelfordState>();
  for (const artist of allArtists) {
    states.set(artist, {
      count: 0,
      mean: 0,
      M2: 0,
      firstMonthIndex: firstMonthIdx.get(artist) ?? 0,
    });
  }

  for (let mi = 0; mi < months.length; mi++) {
    const month = months[mi];
    const monthPlays =
      monthlyArtistPlays.get(month) ?? new Map<string, number>();
    const entries: ZScoreEntry[] = [];

    for (const artist of allArtists) {
      const state = states.get(artist)!;
      // Skip artists who haven't appeared yet
      if (state.firstMonthIndex > mi) continue;

      const plays = monthPlays.get(artist) ?? 0;

      // Welford online update
      state.count++;
      const delta = plays - state.mean;
      state.mean += delta / state.count;
      const delta2 = plays - state.mean;
      state.M2 += delta * delta2;

      let z = 0;
      let std = 0;
      if (state.count >= 2) {
        // Population variance (matching lastfm-stats-web's implementation)
        std = Math.sqrt(state.M2 / state.count);
        if (std > 0) z = (plays - state.mean) / std;
      }

      entries.push({
        artist,
        plays,
        mean: state.mean,
        std,
        z,
        monthCount: state.count,
      });
    }

    // Only store months where at least one artist has a positive z-score
    const positive = entries.filter((e) => e.z > 0).sort((a, b) => b.z - a.z);
    if (positive.length > 0) result.set(month, positive);
  }

  return result;
}

/**
 * For each month, return only the single most statistically unusual artist
 * (highest positive z-score). Suitable for a stat card or timeline chart.
 */
export function topZScorePerMonth(
  monthlyArtistPlays: Map<string, Map<string, number>>,
): Map<string, ZScoreEntry> {
  const all = computeZScores(monthlyArtistPlays);
  const result = new Map<string, ZScoreEntry>();
  for (const [month, entries] of all) {
    if (entries.length > 0) result.set(month, entries[0]);
  }
  return result;
}

export interface SpikeEntry {
  month: string;
  artistName: string;
  plays: number;
  z: number;
}

/**
 * Returns a flattened list of all spikes (z-score ≥ 2.0) across all months,
 * sorted by z-score descending.
 */
export function detectMonthlySpikes(
  monthlyArtistPlays: Map<string, Map<string, number>>,
): SpikeEntry[] {
  const all = computeZScores(monthlyArtistPlays);
  const spikes: SpikeEntry[] = [];

  for (const [month, entries] of all) {
    for (const entry of entries) {
      if (entry.z >= 2.0) {
        spikes.push({
          month,
          artistName: entry.artist,
          plays: entry.plays,
          z: entry.z,
        });
      }
    }
  }

  return spikes.sort((a, b) => b.z - a.z);
}
