import type { ArtistInfo } from '$lib/types';
import type { AggregatedData } from './aggregator';

/**
 * Obscurity index: ratio of niche artists to mainstream.
 * Uses Last.fm listener counts as a proxy for popularity.
 * Returns 0-100 where 100 = all artists are obscure.
 *
 * Scale anchors (log₁₀ of listener count):
 *   ≤ 1,000 listeners  (log = 3) → 1.0  (fully obscure)
 *   ≥ 10,000,000 listeners (log = 7) → 0.0  (fully mainstream)
 *
 * This puts common reference points in sensible positions:
 *   10k   listeners → 0.75  (underground)
 *   100k  listeners → 0.50  (well-known indie)
 *   1M    listeners → 0.25  (mainstream)
 *   10M+  listeners → 0.00  (household name)
 */
export function calculateObscurity(
	data: AggregatedData,
	artistInfos: Map<string, ArtistInfo>
): number {
	let totalWeight = 0;
	let totalObscurityWeight = 0;

	for (const { name, count } of data.topArtists) {
		const info = artistInfos.get(name);
		if (!info?.listenerCount) continue;

		const logListeners = Math.log10(info.listenerCount);
		const obscurity = Math.max(0, Math.min(1, 1 - (logListeners - 3) / 4));

		totalWeight += count;
		totalObscurityWeight += obscurity * count;
	}

	if (totalWeight === 0) return 50;

	return Math.round((totalObscurityWeight / totalWeight) * 100);
}

export function getObscurityLabel(index: number): string {
	if (index >= 80) return 'Deep cuts';
	if (index >= 60) return 'Underground';
	if (index >= 40) return 'Eclectic';
	if (index >= 20) return 'Mainstream';
	return 'Top 40';
}
