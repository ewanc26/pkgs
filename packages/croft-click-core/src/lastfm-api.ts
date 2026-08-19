/**
 * Live Last.fm API fetching — environment-agnostic (uses global `fetch`).
 *
 * Lets Malachite pull a user's scrobble history directly from Last.fm instead
 * of requiring a CSV exported by a third-party tool. Requires a personal
 * Last.fm API key (free — see https://www.last.fm/api/account/create).
 */

import type { LastFmCsvRecord } from './types.js';

const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/';
/** Last.fm's maximum page size for user.getrecenttracks. */
const PAGE_LIMIT = 200;
/** Minimum delay between page requests, to stay well under Last.fm's rate limit. */
const REQUEST_DELAY_MS = 250;

interface LfmTrack {
  name: string;
  mbid?: string;
  artist: { '#text': string; mbid?: string };
  album: { '#text': string; mbid?: string };
  date?: { uts: string };
  '@attr'?: { nowplaying?: string };
}

interface LfmRecentTracksResponse {
  recenttracks?: {
    track: LfmTrack[] | LfmTrack;
    '@attr': { page: string; totalPages: string; total: string };
  };
  error?: number;
  message?: string;
}

export interface LastFmFetchProgress {
  page: number;
  totalPages: number;
  fetched: number;
  total: number;
}

export interface LastFmFetchOptions {
  onProgress?: (progress: LastFmFetchProgress) => void;
  signal?: AbortSignal;
}

function lastFmErrorMessage(body: LfmRecentTracksResponse | null, status: number, username: string): string {
  if (body?.error === 6) return `Last.fm user "${username}" not found.`;
  if (body?.error === 10) return 'Invalid Last.fm API key.';
  if (body?.error === 17) return `"${username}"'s Last.fm listening history is private.`;
  if (body?.error === 29) return 'Last.fm rate limit exceeded — wait a moment and try again.';
  if (body?.message) return `Last.fm API error: ${body.message}`;
  return `Last.fm API request failed (HTTP ${status}).`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

/**
 * Fetch a user's full scrobble history directly from the Last.fm API,
 * paginating through every page of `user.getrecenttracks`.
 *
 * The in-progress "now playing" track (if any) is skipped, since it has no
 * timestamp yet.
 */
export async function fetchLastFmScrobbles(
  username: string,
  apiKey: string,
  { onProgress, signal }: LastFmFetchOptions = {},
): Promise<LastFmCsvRecord[]> {
  const user = username.trim();
  const key = apiKey.trim();
  if (!user) throw new Error('Last.fm username is required.');
  if (!key) throw new Error('Last.fm API key is required.');

  const records: LastFmCsvRecord[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(LASTFM_API);
    url.searchParams.set('method', 'user.getrecenttracks');
    url.searchParams.set('user', user);
    url.searchParams.set('api_key', key);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('page', String(page));

    const res = await fetch(url, { signal });
    const body = (await res.json().catch(() => null)) as LfmRecentTracksResponse | null;

    if (!res.ok || !body || body.error || !body.recenttracks) {
      throw new Error(lastFmErrorMessage(body, res.status, user));
    }

    const data = body.recenttracks;
    totalPages = parseInt(data['@attr'].totalPages, 10) || 1;
    const total = parseInt(data['@attr'].total, 10) || 0;
    const tracks = Array.isArray(data.track) ? data.track : data.track ? [data.track] : [];

    for (const t of tracks) {
      if (!t.date || t['@attr']?.nowplaying === 'true') continue;
      records.push({
        uts: t.date.uts,
        utc_time: new Date(parseInt(t.date.uts, 10) * 1000).toISOString(),
        artist: t.artist['#text'],
        artist_mbid: t.artist.mbid,
        album: t.album['#text'],
        album_mbid: t.album.mbid,
        track: t.name,
        track_mbid: t.mbid,
      });
    }

    onProgress?.({ page, totalPages, fetched: records.length, total });
    page++;

    if (page <= totalPages) await sleep(REQUEST_DELAY_MS, signal);
  } while (page <= totalPages);

  return records;
}
