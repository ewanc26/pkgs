import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CarWriter } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { fetchRepoCollectionsViaCAR } from '@ewanc26/croft-click-core';

const DID = 'did:plc:testtesttesttesttesttest';
const PDS = 'https://pds.example.com';
const LEGACY = 'fm.teal.alpha.feed.play';
const STABLE = 'fm.teal.feed.play';

interface Block {
  cid: CID;
  bytes: Uint8Array;
}

async function rawBlock(bytes: Uint8Array): Promise<Block> {
  const cid = CID.createV1(dagCbor.code, await sha256.digest(bytes));
  return { cid, bytes };
}

async function block(value: unknown): Promise<Block> {
  return rawBlock(dagCbor.encode(value));
}

function sharedPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

async function buildRepoCar(
  entries: Array<{
    collection: string;
    rkey: string;
    value?: unknown;
    rawBytes?: Uint8Array;
  }>,
): Promise<Uint8Array> {
  const recordEntries = await Promise.all(
    entries.map(async (entry) => {
      const recordBlock = entry.rawBytes
        ? await rawBlock(entry.rawBytes)
        : await block(entry.value);
      return {
        key: `${entry.collection}/${entry.rkey}`,
        block: recordBlock,
      };
    }),
  );
  recordEntries.sort((a, b) => a.key.localeCompare(b.key));

  let previousKey = '';
  const mstEntries = recordEntries.map(({ key, block: recordBlock }) => {
    const p = sharedPrefixLength(previousKey, key);
    const entry = {
      p,
      k: new TextEncoder().encode(key.slice(p)),
      v: recordBlock.cid,
      t: null,
    };
    previousKey = key;
    return entry;
  });

  const mstBlock = await block({ l: null, e: mstEntries });
  const commitBlock = await block({
    version: 3,
    did: DID,
    data: mstBlock.cid,
    rev: '3labcdefghijk',
    sig: new Uint8Array([1, 2, 3]),
  });

  const { writer, out } = CarWriter.create([commitBlock.cid]);
  const chunks: Uint8Array[] = [];
  const collecting = (async () => {
    for await (const chunk of out) chunks.push(chunk);
  })();

  await writer.put(commitBlock);
  await writer.put(mstBlock);
  for (const entry of recordEntries) await writer.put(entry.block);
  await writer.close();
  await collecting;

  return new Uint8Array(Buffer.concat(chunks));
}

async function withCarFetch<T>(
  car: Uint8Array,
  run: (requests: string[]) => Promise<T>,
): Promise<T> {
  const realFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    requests.push(String(input));
    return new Response(car, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.ipld.car' },
    });
  }) as typeof fetch;

  try {
    return await run(requests);
  } finally {
    globalThis.fetch = realFetch;
  }
}

describe('fetchRepoCollectionsViaCAR', () => {
  it('extracts multiple collections from one getRepo request', async () => {
    const legacyValue = {
      $type: LEGACY,
      trackName: 'Old namespace',
      artists: [{ artistName: 'Legacy Artist' }],
    };
    const stableValue = {
      $type: STABLE,
      trackName: 'New namespace',
      artists: [{ artistName: 'Stable Artist' }],
    };
    const car = await buildRepoCar([
      { collection: LEGACY, rkey: '3laaa111', value: legacyValue },
      { collection: STABLE, rkey: '3lbbb222', value: stableValue },
      {
        collection: 'app.bsky.feed.post',
        rkey: '3lccc333',
        value: { $type: 'app.bsky.feed.post', text: 'ignore me' },
      },
    ]);

    await withCarFetch(car, async (requests) => {
      const records = await fetchRepoCollectionsViaCAR(PDS, DID, [LEGACY, STABLE]);

      assert.strictEqual(requests.length, 1);
      assert.ok(requests[0].startsWith(`${PDS}/xrpc/com.atproto.sync.getRepo?`));
      assert.deepStrictEqual(records.get(LEGACY)?.map((r) => r.value), [legacyValue]);
      assert.deepStrictEqual(records.get(STABLE)?.map((r) => r.value), [stableValue]);
    });
  });

  it('skips a malformed record block without aborting neighbouring records', async () => {
    const validValue = {
      $type: STABLE,
      trackName: 'Still readable',
      artists: [{ artistName: 'Valid Artist' }],
    };
    const car = await buildRepoCar([
      { collection: STABLE, rkey: '3laaa111', rawBytes: new Uint8Array([0xff]) },
      { collection: STABLE, rkey: '3lbbb222', value: validValue },
    ]);

    await withCarFetch(car, async () => {
      const records = await fetchRepoCollectionsViaCAR(PDS, DID, [STABLE]);

      assert.strictEqual(records.get(STABLE)?.length, 1);
      assert.deepStrictEqual(records.get(STABLE)?.[0].value, validValue);
    });
  });
});
