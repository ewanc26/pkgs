/**
 * Rocksky cross-posting — environment-agnostic.
 *
 * Rocksky (https://rocksky.app) builds listening history from its own
 * `app.rocksky.scrobble` records, not teal.fm's `fm.teal.feed.play`. Writing a
 * matching scrobble for each play lets one import show up in both appviews.
 *
 * Record schema:
 * https://github.com/tsirysndr/rocksky/blob/main/apps/api/lexicons/scrobble/scrobble.json
 */

import type { Client } from '@atproto/lex';
import type { PlayRecord } from './types.js';
import type { PublishTarget } from './publisher.js';
import { fetchRepoViaCARWithClient } from './car-fetch.js';
import {
  buildDedupPlan,
  filterNewRecords,
  recordKey,
  DEFAULT_DEDUP_WINDOW_MS,
  type DedupPlan,
  type DedupPlanOptions,
  type ExistingRecord,
} from './sync.js';
import { canonicalizeTimestamp, epochMillis } from './normalize.js';
import { normalizeMusicBrainzId } from './mbid.js';
import { sortRecords } from './merge.js';

export const ROCKSKY_SCROBBLE_TYPE = 'app.rocksky.scrobble';

/** The part of the scrobble lexicon a play can fill in. */
export interface RockskyScrobble {
  $type: typeof ROCKSKY_SCROBBLE_TYPE;
  title: string;
  artist: string;
  albumArtist: string;
  album: string;
  /** Track length in milliseconds, or 0 when unknown. */
  duration: number;
  /** The listening time. Rocksky's own writers use this field for it. */
  createdAt: string;
  /** MusicBrainz recording ID as a bare UUID. */
  mbid?: string;
  isrc?: string;
}

/**
 * Map a play onto a rocksky scrobble, or return null when the play has no
 * title, artist or valid time, which rocksky can't do without.
 *
 * The lexicon also requires `album` and `duration`, which many exports lack
 * (Last.fm CSVs carry no durations). Rocksky's own importer and its teal.fm
 * mirror write `""` and `0` in that case, so this does the same instead of
 * making values up.
 */
export function toRockskyScrobble(play: PlayRecord): RockskyScrobble | null {
  const artist = play.artists?.[0]?.artistName;
  if (!play.trackName?.trim() || !artist?.trim() || !Number.isFinite(epochMillis(play))) {
    return null;
  }

  const scrobble: RockskyScrobble = {
    $type: ROCKSKY_SCROBBLE_TYPE,
    title: play.trackName,
    artist,
    albumArtist: artist,
    album: play.releaseName ?? '',
    duration: play.duration && play.duration > 0 ? Math.round(play.duration * 1000) : 0,
    createdAt: canonicalizeTimestamp(play.playedTime),
  };
  const mbid = normalizeMusicBrainzId(play.recordingMbId);
  if (mbid) scrobble.mbid = mbid.slice('mbid:'.length);
  if (play.isrc) scrobble.isrc = play.isrc;
  return scrobble;
}

/**
 * Read a stored rocksky scrobble as a play, so the shared sync filter and dedup
 * planner can match it with the rules they already use for teal. The result is
 * only for matching and is never published.
 *
 * `spotifyLink` stands in for `originUrl` so that scrobbles rocksky recorded
 * from Spotify count as a Spotify source. That lets the cross-source window
 * match them, and lets dedup keep rocksky's richer copy over a bare one.
 */
export function rockskyScrobbleAsPlay(value: unknown): PlayRecord {
  const v = (value ?? {}) as Record<string, unknown>;
  const text = (key: string): string | undefined =>
    typeof v[key] === 'string' && v[key] !== '' ? (v[key] as string) : undefined;

  const play: PlayRecord = {
    $type: ROCKSKY_SCROBBLE_TYPE,
    trackName: text('title') ?? '',
    playedTime: text('createdAt') ?? '',
    submissionClientAgent: '',
    musicServiceUri: '',
  };
  const artist = text('artist');
  if (artist) play.artists = [{ artistName: artist }];
  const album = text('album');
  if (album) play.releaseName = album;
  if (typeof v.duration === 'number' && v.duration > 0) play.duration = v.duration / 1000;
  const mbid = normalizeMusicBrainzId(text('mbid'));
  if (mbid) play.recordingMbId = mbid;
  const isrc = text('isrc');
  if (isrc) play.isrc = isrc;
  const spotifyLink = text('spotifyLink');
  if (spotifyLink) play.originUrl = spotifyLink;
  return play;
}

/** Fetch the repo's rocksky scrobbles via CAR export, read as plays for matching. */
export async function fetchRockskyScrobbles(
  client: Client,
  signal?: AbortSignal
): Promise<ExistingRecord[]> {
  const records = await fetchRepoViaCARWithClient(client, ROCKSKY_SCROBBLE_TYPE, client.assertDid, signal);
  return records.map((rec) => ({ uri: rec.uri, cid: rec.cid, value: rockskyScrobbleAsPlay(rec.value) }));
}

export interface RockskyCrossPostPlan {
  /** Plays to write as rocksky scrobbles, oldest first. */
  toPublish: PlayRecord[];
  /** Plays rocksky already has: a matching scrobble, or a play rocksky itself pushed to teal. */
  alreadyInRocksky: number;
  /** Plays with no title, artist or valid time. */
  incomplete: number;
  /** Near-duplicate plays folded together so each listen is cross-posted once. */
  duplicates: number;
}

/**
 * Work out which plays still need a rocksky scrobble. Pure and read-only.
 *
 * @param plays     Plays to cross-post: an import's input, or teal's stored plays.
 * @param existing  The repo's rocksky scrobbles, from {@link fetchRockskyScrobbles}.
 * @param opts.windowMs  Same-listen tolerance (default 60s), as in sync and dedup.
 */
export function planRockskyCrossPost(
  plays: PlayRecord[],
  existing: ExistingRecord[],
  opts: { windowMs?: number } = {}
): RockskyCrossPostPlan {
  const windowMs = opts.windowMs ?? DEFAULT_DEDUP_WINDOW_MS;
  let alreadyInRocksky = 0;
  let incomplete = 0;
  const candidates: PlayRecord[] = [];

  for (const play of plays) {
    // Rocksky marks the plays it pushes to teal, and its own teal mirror skips
    // them by this agent prefix. Their artist string can differ from the
    // scrobble's, so matching alone would miss some and copy them back.
    if ((play.submissionClientAgent ?? '').startsWith('rocksky/')) {
      alreadyInRocksky++;
      continue;
    }
    if (!toRockskyScrobble(play)) {
      incomplete++;
      continue;
    }
    // Plays read back from a PDS can predate musicServiceUri, which the
    // publisher's preflight expects to be a string.
    candidates.push({ ...play, musicServiceUri: play.musicServiceUri ?? '' });
  }

  // A listen stored twice in teal should reach rocksky once.
  const folded = buildDedupPlan(
    candidates.map((value, i) => ({ uri: String(i), cid: '', value })),
    { windowMs }
  );
  const dropped = new Set(folded.groups.flatMap((group) => group.remove.map((rec) => rec.value)));
  const unique = candidates.filter((play) => !dropped.has(play));

  const index = new Map(existing.map((rec) => [recordKey(rec.value), rec]));
  const toPublish = filterNewRecords(unique, index, { windowMs });
  alreadyInRocksky += unique.length - toPublish.length;

  return { toPublish: sortRecords(toPublish), alreadyInRocksky, incomplete, duplicates: dropped.size };
}

/**
 * A dedup plan for rocksky scrobbles. Grouping is the same as teal's, but each
 * group keeps the copy with the most metadata. A bare cross-post and Rocksky's
 * own enriched copy of the same listen tie under the teal rules, which would
 * then keep whichever came first.
 */
export function buildRockskyDedupPlan(
  scrobbles: ExistingRecord[],
  opts: DedupPlanOptions = {}
): DedupPlan {
  const richness = (p: PlayRecord) =>
    [p.duration, p.releaseName, p.recordingMbId, p.isrc, p.originUrl].filter(Boolean).length;
  const plan = buildDedupPlan(scrobbles, opts);
  return {
    ...plan,
    groups: plan.groups.map((group) => {
      const all = [group.keep, ...group.remove];
      const keep = all.reduce((best, rec) => (richness(rec.value) > richness(best.value) ? rec : best), group.keep);
      return { ...group, keep, remove: all.filter((rec) => rec !== keep) };
    }),
  };
}

/**
 * Whether the session may write rocksky scrobbles. An OAuth session from before
 * Malachite asked for `repo:app.rocksky.scrobble` can't, and every write would
 * fail, so callers check first and ask for a fresh sign-in. App-password
 * sessions have no scope list and can write any collection.
 */
export async function canWriteRocksky(client: unknown): Promise<boolean> {
  type TokenInfoSource = { getTokenInfo?: (refresh?: boolean | 'auto') => Promise<{ scope?: string }> };
  const session = ((client as { agent?: unknown } | undefined)?.agent ?? client) as TokenInfoSource | undefined;
  if (typeof session?.getTokenInfo !== 'function') return true;
  try {
    const scopes = ((await session.getTokenInfo('auto')).scope ?? '').split(' ');
    return scopes.some(
      (s) => s === 'transition:generic' || s.startsWith('repo:*') || s.includes(ROCKSKY_SCROBBLE_TYPE)
    );
  } catch {
    // Can't tell; let the writes report their own error.
    return true;
  }
}

/** Pass to `publishRecords` to write plays as rocksky scrobbles. */
export const ROCKSKY_PUBLISH_TARGET: PublishTarget = {
  collection: ROCKSKY_SCROBBLE_TYPE,
  toValue: (play) => {
    const scrobble = toRockskyScrobble(play);
    if (!scrobble) {
      throw new Error(`Cannot cross-post "${play.trackName}" to Rocksky: it has no artist or valid time`);
    }
    return scrobble;
  },
};
