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
