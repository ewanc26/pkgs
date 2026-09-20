/**
 * Optional record-rate ceiling helpers.
 *
 * These helpers cap burst size without replacing the PDS-derived batch
 * calculation. An undefined ceiling keeps the existing automatic behavior.
 */

export function normalizeMaxRecordsPerSecond(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError('maxRecordsPerSecond must be a finite number greater than zero');
  }
  return value;
}

export function capBatchSizeToRecordRate(batchSize: number, maxRecordsPerSecond: number | undefined): number {
  const ceiling = normalizeMaxRecordsPerSecond(maxRecordsPerSecond);
  if (ceiling === undefined) return batchSize;
  return Math.min(batchSize, Math.max(1, Math.floor(ceiling)));
}

export function minimumRecordRateDelayMs(batchSize: number, maxRecordsPerSecond: number | undefined): number {
  const ceiling = normalizeMaxRecordsPerSecond(maxRecordsPerSecond);
  if (ceiling === undefined || batchSize <= 0) return 0;
  return Math.ceil((batchSize / ceiling) * 1000);
}
