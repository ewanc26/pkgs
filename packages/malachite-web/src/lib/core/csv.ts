/**
 * Last.fm CSV — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { LastFmCsvRecord } from '@ewanc26/malachite/core';
import { parseLastFmCsvContent, convertToPlayRecord } from '@ewanc26/malachite/core';

export { parseLastFmCsvContent, convertToPlayRecord };

/** Read a browser File object and parse it as a Last.fm CSV export. */
export async function parseLastFmFile(file: File): Promise<LastFmCsvRecord[]> {
  return parseLastFmCsvContent(await file.text());
}
