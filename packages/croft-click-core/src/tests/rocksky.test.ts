import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '@atproto/lex';
import {
  ROCKSKY_PUBLISH_TARGET,
  ROCKSKY_SCROBBLE_TYPE,
  buildRockskyDedupPlan,
  canWriteRocksky,
  planRockskyCrossPost,
  rockskyScrobbleAsPlay,
  toRockskyScrobble,
} from '../rocksky.js';
import { buildDedupPlan, recordKey, type ExistingRecord } from '../sync.js';
import { publishRecords } from '../publisher.js';
import type { PlayRecord } from '../types.js';

const play = (over: Partial<PlayRecord> = {}): PlayRecord => ({
  $type: 'fm.teal.feed.play',
  trackName: 'Song',
  artists: [{ artistName: 'Artist' }],
  playedTime: '2024-01-01T10:00:00Z',
  submissionClientAgent: 'malachite/v0.21.0',
  musicServiceUri: 'last.fm',
  ...over,
});

/** A stored rocksky scrobble, as fetchRockskyScrobbles would return it. */
const stored = (value: Record<string, unknown>, rkey = '3k'): ExistingRecord => ({
  uri: `at://did:plc:test/${ROCKSKY_SCROBBLE_TYPE}/${rkey}`,
  cid: `c${rkey}`,
  value: rockskyScrobbleAsPlay({ $type: ROCKSKY_SCROBBLE_TYPE, ...value }),
});

describe('toRockskyScrobble', () => {
  it('maps a play onto the scrobble lexicon', () => {
    const scrobble = toRockskyScrobble(play({
      releaseName: 'Album',
      duration: 215,
      playedTime: '2024-01-01T10:00:00+00:00',
      recordingMbId: 'mbid:0F8A2A4B-1C1D-4E5F-8A9B-0C1D2E3F4A5B',
      isrc: 'GBAYE0601498',
    }));
    assert.deepEqual(scrobble, {
      $type: 'app.rocksky.scrobble',
      title: 'Song',
      artist: 'Artist',
      albumArtist: 'Artist',
      album: 'Album',
      duration: 215_000,
      createdAt: '2024-01-01T10:00:00.000Z',
      mbid: '0f8a2a4b-1c1d-4e5f-8a9b-0c1d2e3f4a5b',
      isrc: 'GBAYE0601498',
    });
  });

  it('writes an empty album and zero duration when the play has neither, as rocksky does', () => {
    const scrobble = toRockskyScrobble(play());
    assert.equal(scrobble?.album, '');
    assert.equal(scrobble?.duration, 0);
    assert.equal('mbid' in scrobble!, false);
  });

  it('returns null without an artist or a valid time', () => {
    assert.equal(toRockskyScrobble(play({ artists: undefined })), null);
    assert.equal(toRockskyScrobble(play({ artists: [{ artistName: '  ' }] })), null);
    assert.equal(toRockskyScrobble(play({ playedTime: 'not a date' })), null);
  });
});

describe('rockskyScrobbleAsPlay', () => {
  it('reads a scrobble back under the same sync key as the play it came from', () => {
    const original = play({ releaseName: 'Album', duration: 215 });
    const roundTrip = rockskyScrobbleAsPlay(toRockskyScrobble(original));
    assert.equal(recordKey(roundTrip), recordKey(original));
    assert.equal(roundTrip.duration, 215);
    assert.equal(roundTrip.releaseName, 'Album');
  });

  it('tolerates missing and malformed fields', () => {
    const p = rockskyScrobbleAsPlay({ title: 'Song', duration: 'long', album: '' });
    assert.equal(p.trackName, 'Song');
    assert.equal(p.artists, undefined);
    assert.equal(p.duration, undefined);
    assert.equal(p.releaseName, undefined);
    assert.equal(p.musicServiceUri, '');
  });
});

describe('planRockskyCrossPost', () => {
  it('skips plays rocksky already has, exactly or within the window', () => {
    const plays = [
      play({ trackName: 'Exact', playedTime: '2024-01-01T10:00:00Z' }),
      play({ trackName: 'Close', playedTime: '2024-01-01T11:00:00Z' }),
      play({ trackName: 'New', playedTime: '2024-01-01T12:00:00Z' }),
    ];
    const existing = [
      stored({ title: 'Exact', artist: 'Artist', createdAt: '2024-01-01T10:00:00.000Z' }, 'a'),
      stored({ title: 'close', artist: 'ARTIST', createdAt: '2024-01-01T11:00:40.000Z' }, 'b'),
    ];
    const plan = planRockskyCrossPost(plays, existing);
    assert.deepEqual(plan.toPublish.map((p) => p.trackName), ['New']);
    assert.equal(plan.alreadyInRocksky, 2);
  });

  it('skips plays that rocksky itself pushed to teal', () => {
    // Rocksky can store "A, B" as the scrobble artist while the teal copy
    // lists only "A", so this has to rely on the client agent, not matching.
    const plan = planRockskyCrossPost([play({ submissionClientAgent: 'rocksky/v0.0.1' })], []);
    assert.equal(plan.toPublish.length, 0);
    assert.equal(plan.alreadyInRocksky, 1);
  });

  it('counts plays rocksky cannot take', () => {
    const plan = planRockskyCrossPost([play({ artists: undefined }), play({ trackName: '' })], []);
    assert.equal(plan.toPublish.length, 0);
    assert.equal(plan.incomplete, 2);
  });

  it('cross-posts a listen that teal stores twice only once', () => {
    const plays = [
      play({ playedTime: '2024-01-01T10:00:00Z' }),
      play({ playedTime: '2024-01-01T10:00:00.000Z', musicServiceUri: 'spotify.com' }),
      play({ playedTime: '2024-01-01T10:00:30Z' }),
    ];
    const plan = planRockskyCrossPost(plays, []);
    assert.equal(plan.toPublish.length, 1);
    assert.equal(plan.duplicates, 2);
  });

  it('matches a Spotify export play against a scrobble rocksky took from Spotify', () => {
    // Spotify exports stamp the end of a play; rocksky stamps the start.
    const plan = planRockskyCrossPost(
      [play({ musicServiceUri: 'spotify.com', playedTime: '2024-01-01T10:03:30Z' })],
      [stored({
        title: 'Song',
        artist: 'Artist',
        createdAt: '2024-01-01T10:00:00.000Z',
        spotifyLink: 'https://open.spotify.com/track/abc',
      })]
    );
    assert.equal(plan.toPublish.length, 0);
  });

  it('returns plays oldest first and fills in a missing musicServiceUri', () => {
    const fromPds = { ...play({ playedTime: '2024-01-02T00:00:00Z' }) } as Partial<PlayRecord>;
    delete fromPds.musicServiceUri;
    const plan = planRockskyCrossPost([fromPds as PlayRecord, play({ trackName: 'Earlier' })], []);
    assert.deepEqual(plan.toPublish.map((p) => p.trackName), ['Earlier', 'Song']);
    assert.equal(plan.toPublish[1]!.musicServiceUri, '');
  });
});

describe('buildRockskyDedupPlan', () => {
  it('keeps the copy rocksky recorded from Spotify over a bare one', () => {
    const bare = stored({ title: 'Song', artist: 'Artist', createdAt: '2024-01-01T10:00:00.000Z' }, 'a');
    const rich = stored({
      title: 'Song',
      artist: 'Artist',
      createdAt: '2024-01-01T10:00:20.000Z',
      spotifyLink: 'https://open.spotify.com/track/abc',
    }, 'b');
    const plan = buildRockskyDedupPlan([bare, rich]);
    assert.equal(plan.totalDuplicates, 1);
    assert.equal(plan.groups[0]!.keep.uri, rich.uri);
    assert.equal(plan.groups[0]!.remove[0]!.uri, bare.uri);
  });

  it("keeps Rocksky's enriched copy over an earlier bare cross-post", () => {
    const crossPost = stored({
      title: 'Song', artist: 'Artist', album: '', duration: 0, createdAt: '2024-01-01T10:00:00.000Z',
    }, 'a');
    const enriched = stored({
      title: 'Song', artist: 'Artist', album: 'Album', duration: 215000,
      mbid: '0f8a2a4b-1c1d-4e5f-8a9b-0c1d2e3f4a5b', createdAt: '2024-01-01T10:00:05.000Z',
    }, 'b');
    // The teal rules see two sourceless records and keep the first one.
    assert.equal(buildDedupPlan([crossPost, enriched]).groups[0]!.keep.uri, crossPost.uri);

    const plan = buildRockskyDedupPlan([crossPost, enriched]);
    assert.equal(plan.groups[0]!.keep.uri, enriched.uri);
    assert.deepEqual(plan.groups[0]!.remove.map((r) => r.uri), [crossPost.uri]);
  });
});

describe('canWriteRocksky', () => {
  const oauth = (scope: string) => ({ agent: { getTokenInfo: async () => ({ scope }) } });

  it('is false for an OAuth session signed in before the rocksky scope existed', async () => {
    const old = 'atproto repo:fm.teal.feed.play repo:fm.teal.alpha.feed.play repo:click.croft.toolkit.use';
    assert.equal(await canWriteRocksky(oauth(old)), false);
  });

  it('is true once the scope is granted, or with broad access', async () => {
    assert.equal(await canWriteRocksky(oauth('atproto repo:fm.teal.feed.play repo:app.rocksky.scrobble')), true);
    assert.equal(await canWriteRocksky(oauth('atproto transition:generic')), true);
  });

  it('is true for an app-password session, which has no scope list', async () => {
    assert.equal(await canWriteRocksky({ agent: { fetchHandler: () => {} } }), true);
  });
});

describe('publishRecords with the rocksky target', () => {
  it('writes scrobbles to app.rocksky.scrobble', async () => {
    const calls: { repo: string; writes: { collection: string; value: unknown }[] }[] = [];
    const client = {
      assertDid: 'did:plc:test',
      xrpc: async (_method: unknown, { body }: { body: (typeof calls)[number] }) => {
        calls.push(body);
        return { headers: new Headers(), body: { results: body.writes.map(() => ({})) } };
      },
    } as unknown as Client;

    const result = await publishRecords(
      client,
      [play({ releaseName: 'Album' })],
      false,
      { onProgress: () => {}, onLog: () => {}, isCancelled: () => false },
      'test',
      false,
      false,
      ROCKSKY_PUBLISH_TARGET
    );

    assert.equal(result.successCount, 1);
    assert.equal(calls.length, 1);
    const [write] = calls[0]!.writes;
    assert.equal(write!.collection, 'app.rocksky.scrobble');
    assert.deepEqual(write!.value, toRockskyScrobble(play({ releaseName: 'Album' })));
  });
});
