/**
 * Music metadata enrichment — environment-agnostic.
 *
 * Missing Apple artists are first resolved against Apple's own public catalogue
 * using source-only duration/country hints retained during CSV conversion. Any
 * remaining gaps then fall back to MusicBrainz. Other sources continue to use
 * MusicBrainz directly.
 *
 * Lookups remain best-effort; publication has a separate guard that prevents an
 * unresolved Apple row from being written with a missing artist.
 */

import type { PlayRecord } from './types.js';
import {
  enrichWithAppleCatalog,
  type AppleCatalogProgress,
} from './apple-catalog.js';
import { normalizeMusicBrainzId } from './mbid.js';

/**
 * MusicBrainz asks anonymous clients for at most one request per second, and
 * blocks clients that don't identify themselves. Both are hard requirements of
 * their access policy, not tuning knobs:
 * https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
 */
const MIN_REQUEST_INTERVAL_MS = 1_100;
const SEARCH_ENDPOINT = 'https://musicbrainz.org/ws/2/recording';

/** Only accept a match this confident. MusicBrainz scores 0–100. */
const DEFAULT_MIN_SCORE = 90;

export interface MusicBrainzQuery {
  track: string;
  artist?: string;
  release?: string;
  isrc?: string;
}

export interface MusicBrainzMatch {
  recordingMbId?: string;
  releaseMbId?: string;
  releaseName?: string;
  isrc?: string;
  artists: Array<{ artistName: string; artistMbId?: string }>;
  /** MusicBrainz's own confidence, 0–100. */
  score: number;
}

export interface MusicBrainzOptions {
  /**
   * Sent as `User-Agent`. MusicBrainz requires a contactable identifier and
   * will reject or throttle generic ones.
   */
  userAgent: string;
  /** Minimum score to accept (default 90). */
  minScore?: number;
  /** Overridable for tests. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/** Escape Lucene syntax so a title with quotes or colons can't break the query. */
function escapeLucene(value: string): string {
  return value.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1');
}

function buildQuery(q: MusicBrainzQuery): string {
  const parts: string[] = [];
  if (q.isrc) parts.push(`isrc:"${escapeLucene(q.isrc)}"`);
  if (q.track) parts.push(`recording:"${escapeLucene(q.track)}"`);
  if (q.artist) parts.push(`artist:"${escapeLucene(q.artist)}"`);
  if (q.release) parts.push(`release:"${escapeLucene(q.release)}"`);
  return parts.join(' AND ');
}

function cacheKey(q: MusicBrainzQuery): string {
  return JSON.stringify([q.isrc ?? '', q.track, q.artist ?? '', q.release ?? '']).toLowerCase();
}

interface MbArtistCredit {
  name?: string;
  artist?: { id?: string; name?: string };
}

interface MbRelease {
  id?: string;
  title?: string;
}

interface MbRecording {
  id?: string;
  score?: number;
  title?: string;
  isrcs?: string[];
  'artist-credit'?: MbArtistCredit[];
  releases?: MbRelease[];
}

/** A MusicBrainz client that respects the service's rate limit across calls. */
export class MusicBrainzClient {
  private readonly userAgent: string;
  private readonly minScore: number;
  private readonly fetchImpl: typeof fetch;
  private readonly cache = new Map<string, MusicBrainzMatch | null>();
  private nextSlot = Promise.resolve();

  constructor(opts: MusicBrainzOptions) {
    this.userAgent = opts.userAgent;
    this.minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  get cachedQueryCount(): number {
    return this.cache.size;
  }

  private async waitForSlot(): Promise<void> {
    const mine = this.nextSlot.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS))
    );
    this.nextSlot = mine;
    await mine;
  }

  async lookup(query: MusicBrainzQuery, signal?: AbortSignal): Promise<MusicBrainzMatch | null> {
    if (!query.track?.trim()) return null;

    const key = cacheKey(query);
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const url = `${SEARCH_ENDPOINT}?query=${encodeURIComponent(buildQuery(query))}&fmt=json&limit=1&inc=artists+releases+isrcs`;

    let match: MusicBrainzMatch | null = null;
    try {
      await this.waitForSlot();
      if (signal?.aborted) return null;

      const res = await this.fetchImpl(url, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        signal,
      });

      if (res.status === 503) {
        await this.waitForSlot();
        const retry = await this.fetchImpl(url, {
          headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
          signal,
        });
        match = retry.ok ? this.pickMatch(await retry.json()) : null;
      } else if (res.ok) {
        match = this.pickMatch(await res.json());
      }
    } catch {
      match = null;
    }

    this.cache.set(key, match);
    return match;
  }

  private pickMatch(body: unknown): MusicBrainzMatch | null {
    const recordings = (body as { recordings?: MbRecording[] })?.recordings;
    const top = recordings?.[0];
    if (!top) return null;

    const score = typeof top.score === 'number' ? top.score : 0;
    if (score < this.minScore) return null;

    const artists = (top['artist-credit'] ?? [])
      .map((credit) => {
        const artistName = credit.name ?? credit.artist?.name;
        if (!artistName) return null;
        const artistMbId = normalizeMusicBrainzId(credit.artist?.id);
        return artistMbId ? { artistName, artistMbId } : { artistName };
      })
      .filter((a): a is { artistName: string; artistMbId?: string } => a !== null);

    if (artists.length === 0) return null;

    const release = top.releases?.[0];
    return {
      recordingMbId: normalizeMusicBrainzId(top.id),
      releaseMbId: normalizeMusicBrainzId(release?.id),
      releaseName: release?.title,
      isrc: top.isrcs?.[0],
      artists,
      score,
    };
  }
}

export interface EnrichProgress {
  /** MusicBrainz enrichment candidates processed so far. */
  processed: number;
  /** Records MusicBrainz successfully enriched. */
  enriched: number;
  /** Total records that require MusicBrainz enrichment. */
  total: number;
}

export interface EnrichOptions extends MusicBrainzOptions {
  onProgress?: (p: EnrichProgress) => void;
  /** Progress for the Apple-catalogue stage that runs before MusicBrainz. */
  onAppleCatalogProgress?: (p: AppleCatalogProgress) => void;
  /** Disable Apple-native enrichment, primarily for isolated MusicBrainz tests. */
  appleCatalog?: boolean;
  /** Separate fetch stub so MusicBrainz test doubles aren't sent Apple requests. */
  appleCatalogFetchImpl?: typeof fetch;
  /** Override only for deterministic tests. */
  appleCatalogRequestIntervalMs?: number;
  /**
   * Also look up records that already have an artist, to add missing MBIDs.
   * Off by default: it means a network round trip for nearly every record.
   */
  includeRecordsWithArtists?: boolean;
}

function needsLookup(record: PlayRecord, includeRecordsWithArtists: boolean | undefined): boolean {
  const needsArtist = !record.artists?.length;
  const needsIds = !record.recordingMbId || !record.artists?.[0]?.artistMbId;
  return needsArtist || Boolean(includeRecordsWithArtists && needsIds);
}

function isAppleArtistGap(record: PlayRecord): boolean {
  return record.musicServiceUri.toLowerCase().includes('music.apple.com') && !record.artists?.length;
}

/**
 * Fill missing metadata, preferring Apple's own catalogue for Apple-origin rows
 * before falling back to MusicBrainz.
 */
export async function enrichWithMusicBrainz(
  records: PlayRecord[],
  opts: EnrichOptions
): Promise<{
  records: PlayRecord[];
  enriched: number;
  appleEnriched: number;
  musicBrainzEnriched: number;
  unresolvedApple: number;
}> {
  let working = records;
  let appleEnriched = 0;

  const hasAppleGaps = working.some(isAppleArtistGap);
  // Existing MusicBrainz tests inject one protocol-specific fetch stub. Unless
  // a separate Apple stub is supplied, keep those tests isolated from Apple.
  const canUseAppleFetch = !opts.fetchImpl || Boolean(opts.appleCatalogFetchImpl);
  if (opts.appleCatalog !== false && hasAppleGaps && canUseAppleFetch) {
    const appleResult = await enrichWithAppleCatalog(working, undefined, {
      fetchImpl: opts.appleCatalogFetchImpl,
      signal: opts.signal,
      onProgress: opts.onAppleCatalogProgress,
      requestIntervalMs: opts.appleCatalogRequestIntervalMs,
    });
    working = appleResult.records;
    appleEnriched = appleResult.enriched;
  }

  const client = new MusicBrainzClient(opts);
  const out: PlayRecord[] = [];
  const totalLookups = working.filter((record) => needsLookup(record, opts.includeRecordsWithArtists)).length;
  let processed = 0;
  let musicBrainzEnriched = 0;

  for (const record of working) {
    const needsArtist = !record.artists?.length;
    const needsIds = !record.recordingMbId || !record.artists?.[0]?.artistMbId;

    if (!needsArtist && !(opts.includeRecordsWithArtists && needsIds)) {
      out.push(record);
      continue;
    }

    const match = await client.lookup(
      {
        track: record.trackName,
        artist: record.artists?.[0]?.artistName,
        release: record.releaseName,
        isrc: record.isrc,
      },
      opts.signal
    );
    processed++;

    if (!match) {
      out.push(record);
      opts.onProgress?.({ processed, enriched: musicBrainzEnriched, total: totalLookups });
      continue;
    }

    const next: PlayRecord = { ...record };
    if (needsArtist) next.artists = match.artists;
    if (!next.recordingMbId && match.recordingMbId) next.recordingMbId = match.recordingMbId;
    if (!next.releaseMbId && match.releaseMbId) next.releaseMbId = match.releaseMbId;
    if (!next.releaseName && match.releaseName) next.releaseName = match.releaseName;
    if (!next.isrc && match.isrc) next.isrc = match.isrc;

    out.push(next);
    musicBrainzEnriched++;
    opts.onProgress?.({ processed, enriched: musicBrainzEnriched, total: totalLookups });
  }

  return {
    records: out,
    enriched: appleEnriched + musicBrainzEnriched,
    appleEnriched,
    musicBrainzEnriched,
    unresolvedApple: out.filter(isAppleArtistGap).length,
  };
}
