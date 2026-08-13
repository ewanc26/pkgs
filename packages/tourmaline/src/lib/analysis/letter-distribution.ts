export interface LetterBucket {
  letter: string;
  count: number;
}

/**
 * Bucket names by their first alphanumeric character: A-Z, "0-9" for
 * leading digits, "Other" for anything else (punctuation, emoji, non-Latin
 * scripts that don't normalise to A-Z). Ported from lastfm-stats-web's
 * letter-chart.
 */
export function buildLetterDistribution(names: string[]): LetterBucket[] {
  const counts = new Map<string, number>();
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") counts.set(letter, 0);
  counts.set("0-9", 0);
  counts.set("Other", 0);

  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const first = trimmed[0].toUpperCase();
    if (first >= "0" && first <= "9") {
      counts.set("0-9", (counts.get("0-9") ?? 0) + 1);
    } else if (first >= "A" && first <= "Z") {
      counts.set(first, (counts.get(first) ?? 0) + 1);
    } else {
      counts.set("Other", (counts.get("Other") ?? 0) + 1);
    }
  }

  return [...counts.entries()].map(([letter, count]) => ({ letter, count }));
}
