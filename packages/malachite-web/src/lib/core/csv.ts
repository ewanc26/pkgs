/**
 * Last.fm CSV — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { LastFmCsvRecord, LastFmFetchOptions } from '@ewanc26/croft-click-core';
import {
  parseLastFmCsvContent,
  convertToPlayRecord,
  fetchLastFmScrobbles,
  lastFmRecordsToCsv,
} from '@ewanc26/croft-click-core';

export { parseLastFmCsvContent, convertToPlayRecord, fetchLastFmScrobbles };
export type { LastFmFetchOptions, LastFmFetchProgress } from '@ewanc26/croft-click-core';

/** Read a browser File object and parse it as a Last.fm CSV export. */
export async function parseLastFmFile(file: File): Promise<LastFmCsvRecord[]> {
  return parseLastFmCsvContent(await file.text());
}

/**
 * Fetch a user's scrobble history directly from the Last.fm API and package
 * it as a File, so it flows through the same parse/import pipeline as an
 * uploaded CSV export.
 */
export async function fetchLastFmAsFile(
  username: string,
  apiKey: string,
  options?: LastFmFetchOptions,
): Promise<File> {
  const records = await fetchLastFmScrobbles(username, apiKey, options);
  const csv = lastFmRecordsToCsv(records);
  return new File([csv], `lastfm-${username.trim()}.csv`, { type: 'text/csv' });
}
