import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  capBatchSizeToRecordRate,
  minimumRecordRateDelayMs,
  normalizeMaxRecordsPerSecond,
} from '@ewanc26/croft-click-core';

describe('record-rate ceiling', () => {
  it('leaves automatic batching unchanged when no ceiling is configured', () => {
    assert.strictEqual(capBatchSizeToRecordRate(50, undefined), 50);
    assert.strictEqual(minimumRecordRateDelayMs(50, undefined), 0);
  });

  it('caps a burst to one second of an integer record rate', () => {
    assert.strictEqual(capBatchSizeToRecordRate(50, 4), 4);
    assert.strictEqual(minimumRecordRateDelayMs(4, 4), 1000);
  });

  it('uses single-record batches for fractional rates', () => {
    assert.strictEqual(capBatchSizeToRecordRate(50, 0.5), 1);
    assert.strictEqual(minimumRecordRateDelayMs(1, 0.5), 2000);
  });

  it('preserves smaller PDS-derived batches', () => {
    assert.strictEqual(capBatchSizeToRecordRate(2, 4), 2);
    assert.strictEqual(minimumRecordRateDelayMs(2, 4), 500);
  });

  it('rejects invalid ceilings', () => {
    assert.throws(() => normalizeMaxRecordsPerSecond(0), RangeError);
    assert.throws(() => normalizeMaxRecordsPerSecond(-1), RangeError);
    assert.throws(() => normalizeMaxRecordsPerSecond(Number.NaN), RangeError);
    assert.throws(() => normalizeMaxRecordsPerSecond(Number.POSITIVE_INFINITY), RangeError);
  });
});
