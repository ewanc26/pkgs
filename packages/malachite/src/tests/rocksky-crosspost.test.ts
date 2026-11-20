/**
 * The CLI's --rocksky cross-post, driven through a real @atproto/lex Client
 * against a stub session: the existing scrobbles come from a genuine repo CAR
 * export, and the writes are captured from the applyWrites request.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '@atproto/lex';
import { CarWriter } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { crossPostToRocksky } from '../lib/rocksky.js';
import type { PlayRecord } from '../types.js';

const DID = 'did:plc:testtesttesttesttesttest';
const COLLECTION = 'app.rocksky.scrobble';

async function block(value: unknown): Promise<{ cid: CID; bytes: Uint8Array }> {
  const bytes = dagCbor.encode(value);
  const cid = CID.createV1(dagCbor.code, await sha256.digest(bytes));
  return { cid, bytes };
}

/** A minimal repo export holding one rocksky scrobble. */
async function buildRepoCar(rkey: string, record: unknown): Promise<Uint8Array> {
  const recordBlock = await block(record);
  const mstBlock = await block({
    l: null,
    e: [{ p: 0, k: new TextEncoder().encode(`${COLLECTION}/${rkey}`), v: recordBlock.cid, t: null }],
  });
  const commitBlock = await block({ version: 3, did: DID, data: mstBlock.cid, rev: '3labcdefghijk', sig: new Uint8Array([1]) });

  const { writer, out } = CarWriter.create([commitBlock.cid]);
  const chunks: Uint8Array[] = [];
  const collecting = (async () => {
    for await (const chunk of out) chunks.push(chunk);
  })();
  await writer.put(commitBlock);
  await writer.put(mstBlock);
  await writer.put(recordBlock);
  await writer.close();
  await collecting;
  return new Uint8Array(Buffer.concat(chunks));
}

const play = (trackName: string, playedTime: string): PlayRecord => ({
  $type: 'fm.teal.feed.play',
  trackName,
  artists: [{ artistName: 'Artist' }],
  playedTime,
  submissionClientAgent: 'malachite/v0.21.0',
  musicServiceUri: 'last.fm',
});

describe('crossPostToRocksky (CLI)', () => {
  it('writes scrobbles only for plays rocksky does not already have', async () => {
    const car = await buildRepoCar('3labc123', {
      $type: COLLECTION,
      title: 'Already There',
      artist: 'Artist',
      album: 'Album',
      albumArtist: 'Artist',
      duration: 200000,
      createdAt: '2024-01-01T10:00:00.000Z',
    });

    const writes: { $type: string; collection: string; value: Record<string, unknown> }[] = [];
    const session = {
      did: DID,
      session: { service: 'https://pds.example.com', accessJwt: 'jwt' },
      async fetchHandler(path: string, init?: RequestInit) {
        if (path.startsWith('/xrpc/com.atproto.sync.getRepo')) {
          return new Response(car, { status: 200, headers: { 'Content-Type': 'application/vnd.ipld.car' } });
        }
        if (path.startsWith('/xrpc/com.atproto.repo.applyWrites')) {
          writes.push(...JSON.parse(String(init?.body)).writes);
          return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(null, { status: 404 });
      },
    };

    await crossPostToRocksky(
      new Client(session as never),
      [play('Already There', '2024-01-01T10:00:00Z'), play('New One', '2024-01-02T10:00:00Z')],
      { dryRun: false, yes: true, dangerZone: false }
    );

    assert.strictEqual(writes.length, 1);
    assert.strictEqual(writes[0]!.$type, 'com.atproto.repo.applyWrites#create');
    assert.strictEqual(writes[0]!.collection, COLLECTION);
    assert.deepStrictEqual(writes[0]!.value, {
      $type: COLLECTION,
      title: 'New One',
      artist: 'Artist',
      albumArtist: 'Artist',
      album: '',
      duration: 0,
      createdAt: '2024-01-02T10:00:00.000Z',
    });
  });

  it('writes nothing when the existing scrobbles cannot be read', async () => {
    let wrote = false;
    const session = {
      did: DID,
      session: { service: 'https://pds.example.com', accessJwt: 'jwt' },
      async fetchHandler(path: string) {
        if (path.startsWith('/xrpc/com.atproto.repo.applyWrites')) wrote = true;
        return new Response(null, { status: 500, statusText: 'Server Error' });
      },
    };

    await crossPostToRocksky(
      new Client(session as never),
      [play('New One', '2024-01-02T10:00:00Z')],
      { dryRun: false, yes: true, dangerZone: false }
    );
    assert.strictEqual(wrote, false);
  });
});
