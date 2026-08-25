/**
 * Apple/iTunes Store catalogue lookup for filling gaps in Apple Music exports.
 *
 * Current Apple Music Play Activity exports omit the per-play artist name, and
 * the companion Daily Tracks export can lag several days behind Play Activity.
 * The public iTunes Search API gives us a source-native fallback without an
 * Apple developer token. Matching is deliberately conservative: title alone is
 * never enough when the source gives us a duration or album to validate.
 */

import type { PlayRecord } from './types.js';

const SEARCH_ENDPOINT = 'https://itunes.apple.com/search';
const DEFAULT_REQUEST_INTERVAL_MS = 3_100;
const MAX_DURATION_DELTA_MS = 5_000;

export interface AppleCatalogHint {
  /** Full media duration from Play Activity, not the duration actually played. */
  durationMs?: number;
  /** ISO 3166-1 alpha-2 storefront/country, e.g. GB. */
  country?: string;
}

export interface AppleCatalogMatch {
  artistName: string;
  trackName: string;
  albumName?: string;
  trackId?: number;
}

export interface AppleCatalogProgress {
  processed: number;
  enriched: number;
  total: number;
}

export interface AppleCatalogOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  onProgress?: (progress: AppleCatalogProgress) => void;
  /** Override only for deterministic tests. */
  requestIntervalMs?: number;
}

interface ITunesSearchResult {
  kind?: string;
  artistName?: string;
  trackName?: string;
  collectionName?: string;
  trackTimeMillis?: number;
  trackId?: number;
}

interface ITunesSearchResponse {
  results?: ITunesSearchResult[];
}

/**
 * Source-only lookup hints travel with the in-memory PlayRecord object without
 * becoming enumerable properties that could leak into an ATProto write.
 */
const hintsByRecord = new WeakMap<PlayRecord, AppleCatalogHint>();

export function registerAppleCatalogHint(record: PlayRecord, hint: AppleCatalogHint): void {
  hintsByRecord.set(record, hint);
}

export function getAppleCatalogHint(record: PlayRecord): AppleCatalogHint | undefined {
  return hintsByRecord.get(record);
}

function normalize(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function releaseKey(value: string | undefined): string {
  return normalize(value).replace(/\s*-\s*(single|ep)$/i, '').trim();
}

/**
 * Apple sometimes omits a trailing treatment descriptor in Play Activity while
 * the catalogue keeps it, e.g. `Blis` vs `Blis (Sleep)`. Prefix compatibility
 * is only accepted alongside a strong album or duration match below.
 */
function titleCompatibility(source: string, candidate: string): 'exact' | 'suffix' | null {
  const a = normalize(source);
  const b = normalize(candidate);
  if (!a || !b) return null;
  if (a === b) return 'exact';
  if (b.startsWith(`${a} (`) || a.startsWith(`${b} (`)) return 'suffix';
  return null;
}

function lookupKey(record: PlayRecord, hint: AppleCatalogHint | undefined): string {
  return JSON.stringify([
    normalize(record.trackName),
    releaseKey(record.releaseName),
    hint?.durationMs ?? null,
    (hint?.country ?? 'US').toUpperCase(),
  ]);
}

function searchKey(record: PlayRecord, hint: AppleCatalogHint | undefined): string {
  return JSON.stringify([
    normalize(record.trackName),
    (hint?.country ?? 'US').toUpperCase(),
  ]);
}

/** Stable key used by callers that explicitly keep a sidecar map. */
export function appleCatalogHintKey(record: Pick<PlayRecord, 'trackName' | 'playedTime'>): string {
  return JSON.stringify([normalize(record.trackName), record.playedTime]);
}

function scoreCandidate(
  record: PlayRecord,
  hint: AppleCatalogHint | undefined,
  candidate: ITunesSearchResult,
): number | null {
  if (candidate.kind && candidate.kind !== 'song') return null;
  if (!candidate.artistName || !candidate.trackName) return null;

  const titleMatch = titleCompatibility(record.trackName, candidate.trackName);
  if (!titleMatch) return null;

  const sourceAlbum = releaseKey(record.releaseName);
  const candidateAlbum = releaseKey(candidate.collectionName);
  const albumMatches = Boolean(sourceAlbum && candidateAlbum && sourceAlbum === candidateAlbum);

  const sourceDuration = hint?.durationMs;
  const candidateDuration = candidate.trackTimeMillis;
  const durationDelta =
    sourceDuration && candidateDuration
      ? Math.abs(sourceDuration - candidateDuration)
      : undefined;
  const durationMatches = durationDelta !== undefined && durationDelta <= MAX_DURATION_DELTA_MS;

  // Never accept a weaker title match without corroboration. If Apple gave us
  // an album or media duration, at least one of those must agree with the
  // catalogue candidate. This is what prevents common titles such as `Canyon`,
  // `Astral`, or `succession` from resolving to an unrelated popular song.
  if (titleMatch === 'suffix' && !albumMatches && !durationMatches) return null;
  if (sourceAlbum && !albumMatches && !durationMatches) return null;
  if (!sourceAlbum && sourceDuration && !durationMatches) return null;
  if (!sourceAlbum && !sourceDuration && titleMatch !== 'exact') return null;

  let score = titleMatch === 'exact' ? 100 : 70;
  if (albumMatches) score += 50;
  if (durationMatches && durationDelta !== undefined) {
    score += durationDelta <= 1_000 ? 50 : 40;
  }
  return score;
}

export class AppleCatalogClient {
  private readonly fetchImpl: typeof fetch;
  private readonly requestIntervalMs: number;
  private readonly cache = new Map<string, AppleCatalogMatch | null>();
  /** Search responses are cached by title + storefront, then rescored locally. */
  private readonly searchCache = new Map<string, ITunesSearchResult[]>();
  private nextSlot = Promise.resolve();

  constructor(opts: AppleCatalogOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.requestIntervalMs = opts.requestIntervalMs ?? DEFAULT_REQUEST_INTERVAL_MS;
  }

  private async waitForSlot(): Promise<void> {
    if (this.requestIntervalMs <= 0) return;
    const mine = this.nextSlot.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, this.requestIntervalMs)),
    );
    this.nextSlot = mine;
    await mine;
  }

  private async search(
    record: PlayRecord,
    hint: AppleCatalogHint | undefined,
    signal?: AbortSignal,
  ): Promise<ITunesSearchResult[]> {
    const key = searchKey(record, hint);
    const cached = this.searchCache.get(key);
    if (cached !== undefined) return cached;

    const country = (hint?.country ?? 'US').toLowerCase();
    const params = new URLSearchParams({
      term: record.trackName,
      country,
      media: 'music',
      entity: 'song',
      attribute: 'songTerm',
      limit: '25',
    });

    await this.waitForSlot();
    signal?.throwIfAborted();

    const response = await this.fetchImpl(`${SEARCH_ENDPOINT}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) {
      this.searchCache.set(key, []);
      return [];
    }

    const body = (await response.json()) as ITunesSearchResponse;
    const results = body.results ?? [];
    this.searchCache.set(key, results);
    return results;
  }

  async lookup(
    record: PlayRecord,
    hint: AppleCatalogHint | undefined,
    signal?: AbortSignal,
  ): Promise<AppleCatalogMatch | null> {
    const key = lookupKey(record, hint);
    if (this.cache.has(key)) return this.cache.get(key)!;

    let match: AppleCatalogMatch | null = null;
    try {
      const candidates = await this.search(record, hint, signal);
      const scored = candidates
        .map((candidate) => ({ candidate, score: scoreCandidate(record, hint, candidate) }))
        .filter((entry): entry is { candidate: ITunesSearchResult; score: number } => entry.score !== null)
        .sort((a, b) => b.score - a.score);

      const top = scored[0];
      if (top) {
        // A tied best score with different artists is genuinely ambiguous. Do
        // not guess; MusicBrainz gets a chance next and the importer ultimately
        // refuses to publish an unresolved artist.
        const tiedArtists = new Set(
          scored
            .filter((entry) => entry.score === top.score)
            .map((entry) => normalize(entry.candidate.artistName)),
        );
        if (tiedArtists.size === 1) {
          match = {
            artistName: top.candidate.artistName!,
            trackName: top.candidate.trackName!,
            albumName: top.candidate.collectionName,
            trackId: top.candidate.trackId,
          };
        }
      }
    } catch {
      match = null;
    }

    this.cache.set(key, match);
    return match;
  }
}

/**
 * Fill missing Apple-origin artists using Apple's public catalogue.
 *
 * Repeated plays sharing the same title/album/duration are looked up once and
 * the result is applied to every matching play. Existing artist data is never
 * overwritten. Callers may pass an explicit sidecar map; otherwise the hidden
 * per-record hints registered during Apple conversion are used.
 */
export async function enrichWithAppleCatalog(
  records: PlayRecord[],
  hints: Map<string, AppleCatalogHint> | undefined,
  opts: AppleCatalogOptions = {},
): Promise<{ records: PlayRecord[]; enriched: number; unresolved: number }> {
  const client = new AppleCatalogClient(opts);
  const out = [...records];
  const groups = new Map<string, { indices: number[]; record: PlayRecord; hint?: AppleCatalogHint }>();

  for (const [index, record] of records.entries()) {
    if (record.artists?.length) continue;
    if (!record.musicServiceUri.toLowerCase().includes('music.apple.com')) continue;

    const hint = hints?.get(appleCatalogHintKey(record)) ?? getAppleCatalogHint(record);
    if (!hint) continue;

    const key = lookupKey(record, hint);
    const existing = groups.get(key);
    if (existing) existing.indices.push(index);
    else groups.set(key, { indices: [index], record, hint });
  }

  let processed = 0;
  let enriched = 0;
  const total = groups.size;

  for (const group of groups.values()) {
    const match = await client.lookup(group.record, group.hint, opts.signal);
    processed++;

    if (match) {
      for (const index of group.indices) {
        const record = out[index]!;
        const next: PlayRecord = {
          ...record,
          artists: [{ artistName: match.artistName }],
        };
        if (!next.releaseName && match.albumName) next.releaseName = match.albumName;
        out[index] = next;
        enriched += 1;
      }
    }

    opts.onProgress?.({ processed, enriched, total });
  }

  return {
    records: out,
    enriched,
    unresolved: out.filter(
      (record) => record.musicServiceUri.toLowerCase().includes('music.apple.com') && !record.artists?.length,
    ).length,
  };
}
