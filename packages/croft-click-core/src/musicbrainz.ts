/**
 * MusicBrainz lookup — environment-agnostic.
 *
 * Fills in what an export left out. Apple's current Play Activity CSV has no
 * artist column at all, and several sources carry a track title with no
 * MusicBrainz identifiers, so a title (plus whatever else is known) is searched
 * against MusicBrainz to recover the artist credit and MBIDs.
 *
 * Everything here is best-effort: a lookup that fails, times out, or matches
 * nothing leaves the record exactly as it was. Enrichment must never lose a
 * play or fail an import.
 */

import type { PlayRecord } from './types.js';
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
  // ISRC alone is an exact identifier — when present it outranks fuzzy text.
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

/**
 * A MusicBrainz client that respects the service's rate limit across calls.
 *
 * Hold one instance for a whole import: the spacing and the cache are both
 * per-instance, so a fresh client per lookup would breach the rate limit and
 * re-fetch everything.
 */
export class MusicBrainzClient {
  private readonly userAgent: string;
  private readonly minScore: number;
  private readonly fetchImpl: typeof fetch;
  private readonly cache = new Map<string, MusicBrainzMatch | null>();
  /** Resolves when the next request is allowed to go out. */
  private nextSlot = Promise.resolve();

  constructor(opts: MusicBrainzOptions) {
    this.userAgent = opts.userAgent;
    this.minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /** Number of distinct queries answered from cache rather than the network. */
  get cachedQueryCount(): number {
    return this.cache.size;
  }

  /**
   * Serialise requests one-per-interval. Chaining onto a shared promise keeps
   * the spacing correct even when callers fire lookups concurrently.
   */
  private async waitForSlot(): Promise<void> {
    const mine = this.nextSlot.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS))
    );
    this.nextSlot = mine;
    await mine;
  }

  /**
   * Look up one recording. Returns `null` when nothing matched confidently, and
   * also when the request failed — callers treat both the same way (leave the
   * record alone), and an import must not die because MusicBrainz was down.
   */
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

      // 503 is MusicBrainz's "slow down". One retry after a full interval; if
      // it's still unhappy, give up on this row rather than stalling the import.
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
      // Network error, abort, or malformed JSON — all mean "no enrichment".
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
  /** Records that needed a lookup and got one. */
  enriched: number;
  /** Total records that require MusicBrainz enrichment. */
  total: number;
}

export interface EnrichOptions extends MusicBrainzOptions {
  onProgress?: (p: EnrichProgress) => void;
  /**
   * Also look up records that already have an artist, to add missing MBIDs.
   * Off by default: it means a network round trip for nearly every record,
   * which at one request per second is hours for a large import.
   */
  includeRecordsWithArtists?: boolean;
}

function needsLookup(record: PlayRecord, includeRecordsWithArtists: boolean | undefined): boolean {
  const needsArtist = !record.artists?.length;
  const needsIds = !record.recordingMbId || !record.artists?.[0]?.artistMbId;
  return needsArtist || Boolean(includeRecordsWithArtists && needsIds);
}

/**
 * Fill in missing artists (and MBIDs) from MusicBrainz.
 *
 * Returns new records; the input is not mutated. Records that can't be matched
 * come back unchanged, so this is always safe to run — the worst case is that
 * nothing improves.
 */
export async function enrichWithMusicBrainz(
  records: PlayRecord[],
  opts: EnrichOptions
): Promise<{ records: PlayRecord[]; enriched: number }> {
  const client = new MusicBrainzClient(opts);
  const out: PlayRecord[] = [];
  const totalLookups = records.filter((record) => needsLookup(record, opts.includeRecordsWithArtists)).length;
  let processed = 0;
  let enriched = 0;

  for (const record of records) {
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
      opts.onProgress?.({ processed, enriched, total: totalLookups });
      continue;
    }

    // Never overwrite what the export already told us — MusicBrainz is filling
    // gaps, not correcting the source.
    const next: PlayRecord = { ...record };
    if (needsArtist) next.artists = match.artists;
    if (!next.recordingMbId && match.recordingMbId) next.recordingMbId = match.recordingMbId;
    if (!next.releaseMbId && match.releaseMbId) next.releaseMbId = match.releaseMbId;
    if (!next.releaseName && match.releaseName) next.releaseName = match.releaseName;
    if (!next.isrc && match.isrc) next.isrc = match.isrc;

    out.push(next);
    enriched++;
    opts.onProgress?.({ processed, enriched, total: totalLookups });
  }

  return { records: out, enriched };
}
