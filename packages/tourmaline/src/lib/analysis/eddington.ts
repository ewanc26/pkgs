/**
 * Calculates the Eddington number for scrobbles.
 * The Eddington number is the largest integer E such that you have
 * at least E scrobbles on at least E different days.
 *
 * @param dailyCounts - Map of YYYY-MM-DD to scrobble count
 */
export function calcEddington(dailyCounts: Map<string, number>): number {
  const counts = Array.from(dailyCounts.values()).sort((a, b) => b - a);

  let e = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] >= i + 1) {
      e = i + 1;
    } else {
      break;
    }
  }

  return e;
}

/**
 * How many more days need at least `eddington + 1` scrobbles to reach the
 * next Eddington number. Counts days already at or above that target, since
 * qualifying days can come from existing days growing past the threshold as
 * much as from new days.
 */
export function daysToNextEddington(
  dailyCounts: Map<string, number>,
  eddington: number,
): number {
  const target = eddington + 1;
  const daysAtTarget = [...dailyCounts.values()].filter((c) => c >= target).length;
  return Math.max(0, target - daysAtTarget);
}
