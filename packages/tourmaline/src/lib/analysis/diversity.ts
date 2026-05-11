import type { AggregatedData } from './aggregator';

/**
 * Shannon entropy measures how uniform the distribution is.
 * Higher = more diverse taste. Lower = concentrated on fewer artists.
 * Range: 0 (all plays go to one artist) to ln(N) (perfectly uniform across N artists).
 */
export function calculateDiversity(data: AggregatedData): number {
	const total = data.totalScrobbles;
	if (total === 0) return 0;

	let entropy = 0;
	for (const count of data.artistPlayCounts.values()) {
		if (count === 0) continue;
		const p = count / total;
		entropy -= p * Math.log(p);
	}

	// Normalise to 0-100 scale
	// Max entropy is ln(uniqueArtists). Normalise against that.
	const maxEntropy = Math.log(data.uniqueArtists);
	if (maxEntropy === 0) return 0;

	return Math.round((entropy / maxEntropy) * 100);
}

/**
 * Gini coefficient — measures inequality.
 * 0 = perfectly equal distribution, 1 = all plays go to one artist.
 * Lower = more diverse.
 *
 * Uses the O(n log n) sorted-array formula rather than the naive O(n²)
 * double-loop, which becomes expensive at a few thousand artists.
 *
 * Formula (1-indexed, ascending sort):
 *   G = (2 * Σ i·xᵢ) / (n · Σ xᵢ) - (n + 1) / n
 */
export function calculateGini(data: AggregatedData): number {
	const counts = [...data.artistPlayCounts.values()].sort((a, b) => a - b);
	const n = counts.length;
	if (n === 0) return 0;

	const sum = counts.reduce((a, b) => a + b, 0);
	if (sum === 0) return 0;

	let weightedSum = 0;
	for (let i = 0; i < n; i++) {
		weightedSum += (i + 1) * counts[i];
	}

	return (2 * weightedSum) / (n * sum) - (n + 1) / n;
}

/**
 * Combine diversity metrics into a single score.
 * Returns 0-100 where 100 = maximally diverse.
 */
export function diversityScore(data: AggregatedData): number {
	const shannon = calculateDiversity(data);
	const gini = calculateGini(data);

	// Shannon is already 0-100 (higher = more diverse)
	// Gini is 0-1 (lower = more diverse), invert and scale
	const giniInverted = (1 - gini) * 100;

	// Weight Shannon more (it's more informative)
	return Math.round(shannon * 0.7 + giniInverted * 0.3);
}
