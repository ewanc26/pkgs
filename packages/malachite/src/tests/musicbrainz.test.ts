import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MusicBrainzClient, enrichWithMusicBrainz } from '@ewanc26/croft-click-core';
import type { PlayRecord } from '@ewanc26/croft-click-core';

const AGENT = 'malachite-test/0 ( https://example.invalid )';

/** A stub `fetch` that records calls and replies with canned MusicBrainz JSON. */
function stubFetch(body: unknown, opts: { status?: number } = {}) {
  const calls: string[] = [];
  const impl = (async (url: string | URL) => {
    calls.push(String(url));
    return {
      ok: (opts.status ?? 200) < 400,
      status: opts.status ?? 200,
      json: async () => body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const RECORDING = {
  recordings: [
    {
      id: '11111111-2222-3333-4444-555555555555',
      score: 100,
      title: 'stargirl',
      isrcs: ['USUG12000001'],
      'artist-credit': [
        { name: 'The Weeknd', artist: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'The Weeknd' } },
      ],
      releases: [{ id: '99999999-8888-7777-6666-555555555555', title: 'Starboy' }],
    },
  ],
};

describe('MusicBrainz client', () => {
  it('should return the artist credit and normalised MBIDs', async () => {
    const { impl, calls } = stubFetch(RECORDING);
    const client = new MusicBrainzClient({ userAgent: AGENT, fetchImpl: impl });

    const match = await client.lookup({ track: 'stargirl' });

    assert.ok(match);
    assert.strictEqual(match.artists[0].artistName, 'The Weeknd');
    // Bare UUIDs from the API must come back as the lexicon's mbid: URI form.
    assert.strictEqual(match.artists[0].artistMbId, 'mbid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    assert.strictEqual(match.recordingMbId, 'mbid:11111111-2222-3333-4444-555555555555');
    assert.strictEqual(match.releaseMbId, 'mbid:99999999-8888-7777-6666-555555555555');
    assert.strictEqual(match.releaseName, 'Starboy');
    assert.strictEqual(calls.length, 1);
  });

  it('should reject a low-confidence match', async () => {
    const { impl } = stubFetch({ recordings: [{ ...RECORDING.recordings[0], score: 40 }] });
    const client = new MusicBrainzClient({ userAgent: AGENT, fetchImpl: impl });

    assert.strictEqual(await client.lookup({ track: 'stargirl' }), null);
  });

  it('should cache repeat queries instead of refetching', async () => {
    const { impl, calls } = stubFetch(RECORDING);
    const client = new MusicBrainzClient({ userAgent: AGENT, fetchImpl: impl });

    await client.lookup({ track: 'stargirl' });
    await client.lookup({ track: 'stargirl' });

    assert.strictEqual(calls.length, 1);
  });

  it('should return null rather than throwing when the request fails', async () => {
    const impl = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const client = new MusicBrainzClient({ userAgent: AGENT, fetchImpl: impl });

    assert.strictEqual(await client.lookup({ track: 'stargirl' }), null);
  });

  it('should send a User-Agent, which MusicBrainz requires', async () => {
    let headers: Record<string, string> | undefined;
    const impl = (async (_url: string, init?: RequestInit) => {
      headers = init?.headers as Record<string, string>;
      return { ok: true, status: 200, json: async () => RECORDING } as unknown as Response;
    }) as unknown as typeof fetch;

    await new MusicBrainzClient({ userAgent: AGENT, fetchImpl: impl }).lookup({ track: 'x' });

    assert.strictEqual(headers?.['User-Agent'], AGENT);
  });
});

describe('MusicBrainz enrichment', () => {
  const base: PlayRecord = {
    $type: 'fm.teal.feed.play',
    trackName: 'stargirl',
    playedTime: '2026-01-02T03:04:05.000Z',
    submissionClientAgent: 'malachite/test',
    musicServiceUri: 'https://music.apple.com/',
  };

  it('should fill in a missing artist', async () => {
    const { impl } = stubFetch(RECORDING);

    const { records, enriched } = await enrichWithMusicBrainz([base], {
      userAgent: AGENT,
      fetchImpl: impl,
    });

    assert.strictEqual(enriched, 1);
    assert.strictEqual(records[0].artists?.[0].artistName, 'The Weeknd');
    assert.strictEqual(records[0].recordingMbId, 'mbid:11111111-2222-3333-4444-555555555555');
  });

  it('should leave records that already have an artist untouched', async () => {
    const { impl, calls } = stubFetch(RECORDING);
    const withArtist: PlayRecord = { ...base, artists: [{ artistName: 'Someone Else' }] };

    const { records, enriched } = await enrichWithMusicBrainz([withArtist], {
      userAgent: AGENT,
      fetchImpl: impl,
    });

    // No lookup at all, and the export's own data is preserved.
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(enriched, 0);
    assert.strictEqual(records[0].artists?.[0].artistName, 'Someone Else');
  });

  it('should never drop a record when nothing matches', async () => {
    const { impl } = stubFetch({ recordings: [] });

    const { records, enriched } = await enrichWithMusicBrainz([base], {
      userAgent: AGENT,
      fetchImpl: impl,
    });

    assert.strictEqual(enriched, 0);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].trackName, 'stargirl');
    assert.ok(!records[0].artists);
  });
});
