import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateImportDuration,
  formatDurationWords,
  formatImportEstimate,
  LONG_IMPORT_THRESHOLD_SECONDS,
} from '../import-estimate.js';

describe('estimateImportDuration', () => {
  it('returns a zero, non-long estimate for empty or invalid input', () => {
    const est = estimateImportDuration(0, 5000, 3600);
    assert.equal(est.bestCaseSeconds, 0);
    assert.equal(est.worstCaseSeconds, 0);
    assert.equal(est.isLongImport, false);

    const invalid = estimateImportDuration(100, 0, 3600);
    assert.equal(invalid.bestCaseSeconds, 0);
    assert.equal(invalid.isLongImport, false);
  });

  it('bounds a large import against the standard hourly window', () => {
    // 10,000 records at 3 points each against the advertised 5,000 pts/hour:
    // best case paces at that refill rate (80% utilisation), worst case also
    // assumes the standard 35,000 pts/day repository-write budget, which is
    // exactly the situation from #94 where a large import takes days.
    const est = estimateImportDuration(10_000, 5_000, 3_600);

    const points = 30_000;
    const hourlyPps = 5_000 / 3_600;
    const dailyPps = 35_000 / 86_400;
    const expectedBest = points / (hourlyPps * 0.8);
    const expectedWorst = points / (dailyPps * 0.8);

    assert.ok(Math.abs(est.bestCaseSeconds - expectedBest) / expectedBest < 1e-9);
    assert.ok(Math.abs(est.worstCaseSeconds - expectedWorst) / expectedWorst < 1e-9);
    assert.equal(est.dailyBudgetKnown, false);
    assert.equal(est.worstCaseSeconds > est.bestCaseSeconds, true);
    assert.equal(est.isLongImport, true, '10k records on the standard hourly bucket takes > 24h in the worst case');
  });

  it('collapses to a point estimate when the advertised window is the daily budget', () => {
    const est = estimateImportDuration(10_000, 35_000, 86_400);
    assert.equal(est.dailyBudgetKnown, true);
    assert.ok(Math.abs(est.bestCaseSeconds - est.worstCaseSeconds) < 1e-9);
    assert.equal(est.isLongImport, true, 'the rate-shaped daily budget itself makes this a long import');
  });

  it('never reports a worst case below the best case', () => {
    // A small hourly window is already tighter than the reference daily
    // budget, so the daily assumption cannot extend the estimate.
    const est = estimateImportDuration(1_000, 1_000, 3_600);
    assert.equal(est.bestCaseSeconds, est.worstCaseSeconds);
    assert.equal(est.isLongImport, false, '1k records on a 1,000 pts/hour bucket fits in under a day');
  });

  it('flags imports that only cross the threshold in the worst case', () => {
    // 9,500 records: best case ~6.9 h, worst case ~24.4 h (#94: warn even
    // when only the daily-capped bound exceeds a day).
    const est = estimateImportDuration(9_500, 5_000, 3_600);
    assert.equal(est.bestCaseSeconds < LONG_IMPORT_THRESHOLD_SECONDS, true);
    assert.equal(est.isLongImport, true);
  });

  it('scales with the observed points-per-record when provided', () => {
    const assumed = estimateImportDuration(10_000, 5_000, 3_600, 3);
    const observed = estimateImportDuration(10_000, 5_000, 3_600, 1);
    assert.equal(observed.worstCaseSeconds, assumed.worstCaseSeconds / 3);
  });
});

describe('estimate formatting', () => {
  it('formats durations readably', () => {
    assert.equal(formatDurationWords(45), '45s');
    assert.equal(formatDurationWords(300), '5 min');
    assert.equal(formatDurationWords(9_000), '2.5 h');
    assert.equal(formatDurationWords(4 * 86_400), '4.0 days');
  });

  it('prints a single value when both bounds agree', () => {
    const est = estimateImportDuration(1_000, 1_000, 3_600);
    assert.equal(formatImportEstimate(est), `~${formatDurationWords(est.bestCaseSeconds)}`);
  });

  it('prints a range when the daily budget extends the estimate', () => {
    const est = estimateImportDuration(10_000, 5_000, 3_600);
    const expected =
      `~${formatDurationWords(est.bestCaseSeconds)}` +
      ` – ~${formatDurationWords(est.worstCaseSeconds)}`;
    assert.equal(formatImportEstimate(est), expected);
  });

  it('matches the documented long-import threshold', () => {
    assert.equal(LONG_IMPORT_THRESHOLD_SECONDS, 24 * 60 * 60);
  });
});
