import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ProactiveRatePacer,
  getEffectiveRepoWriteWindow,
} from '@ewanc26/croft-click-core';

describe('ProactiveRatePacer repository write windows', () => {
  it('adds the standard daily write budget when the hourly CREATE bucket is advertised', () => {
    const window = getEffectiveRepoWriteWindow(5_000, 3_600, 4_500, 3);

    assert.deepStrictEqual(window, {
      limit: 35_000,
      windowSeconds: 86_400,
      remaining: 35_000,
      inferred: true,
    });
  });

  it('preserves the server remainder when the daily write bucket is advertised directly', () => {
    const window = getEffectiveRepoWriteWindow(35_000, 86_400, 12_345, 3);

    assert.deepStrictEqual(window, {
      limit: 35_000,
      windowSeconds: 86_400,
      remaining: 12_345,
      inferred: false,
    });
  });

  it('does not invent a daily budget for a different provider policy', () => {
    const window = getEffectiveRepoWriteWindow(10_000, 3_600, 9_000, 3);

    assert.deepStrictEqual(window, {
      limit: 10_000,
      windowSeconds: 3_600,
      remaining: 9_000,
      inferred: false,
    });
  });

  it('does not treat a request-counted bucket as a three-point CREATE bucket', () => {
    const window = getEffectiveRepoWriteWindow(5_000, 3_600, 4_500, 1);

    assert.deepStrictEqual(window, {
      limit: 5_000,
      windowSeconds: 3_600,
      remaining: 4_500,
      inferred: false,
    });
  });

  it('paces a standard write bucket below the 35,000 point daily limit', () => {
    const pacer = new ProactiveRatePacer();

    const batchSize = pacer.calculateOptimalBatchSize(5_000, 3_600, 5_000, 200, 3);
    const pacing = pacer.calculateDelay(batchSize, 5_000, 3_600, 5_000, 3);

    assert.strictEqual(batchSize, 4);
    assert(pacing.delayMs > 35_000 && pacing.delayMs < 40_000);
    assert(pacing.sustainableRate < 0.11);
    assert.match(pacing.reason, /35,000 pts\/86400s write policy/);
  });
});
