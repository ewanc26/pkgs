import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CarWriter } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import {
  fetchRepoCollectionsViaCAR,
  iterateRepoCollectionsViaCAR,
  type CARCollectionRecord,
} from '@ewanc26/croft-click-core';

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
  recordsBeforeMst = false,
  commitLast = false,
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

  if (!commitLast) await writer.put(commitBlock);
  if (recordsBeforeMst) {
    for (const entry of recordEntries) await writer.put(entry.block);
    await writer.put(mstBlock);
  } else {
    await writer.put(mstBlock);
    for (const entry of recordEntries) await writer.put(entry.block);
  }
  if (commitLast) await writer.put(commitBlock);
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
    const third = Math.ceil(car.length / 3);
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (let start = 0; start < car.length; start += third) {
            controller.enqueue(car.slice(start, start + third));
          }
          controller.close();
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.ipld.car' },
      },
    );
    // The CAR fetcher must consume the response stream, never buffer the
    // complete export through Response.arrayBuffer().
    Object.defineProperty(response, 'arrayBuffer', {
      value: async () => {
        throw new Error('arrayBuffer() must not be called');
      },
    });
    return response;
  }) as typeof fetch;

  try {
    return await run(requests);
  } finally {
    globalThis.fetch = realFetch;
  }
}

describe('fetchRepoCollectionsViaCAR', () => {
  it('yields selected records with their collection without building a result map', async () => {
    const legacyValue = {
      $type: LEGACY,
      trackName: 'Legacy stream',
      artists: [{ artistName: 'Legacy Artist' }],
    };
    const stableValue = {
      $type: STABLE,
      trackName: 'Stable stream',
      artists: [{ artistName: 'Stable Artist' }],
    };
    const car = await buildRepoCar(
      [
        { collection: LEGACY, rkey: '3laaa111', value: legacyValue },
        { collection: STABLE, rkey: '3lbbb222', value: stableValue },
      ],
      true,
      true,
    );

    await withCarFetch(car, async (requests) => {
      const yielded: CARCollectionRecord[] = [];
      for await (const entry of iterateRepoCollectionsViaCAR(PDS, DID, [LEGACY, STABLE])) {
        yielded.push(entry);
      }

      assert.strictEqual(requests.length, 1);
      assert.deepStrictEqual(
        yielded.map(({ collection, record }) => ({
          collection,
          rkey: record.rkey,
          value: record.value,
        })),
        [
          { collection: LEGACY, rkey: '3laaa111', value: legacyValue },
          { collection: STABLE, rkey: '3lbbb222', value: stableValue },
        ],
      );
    });
  });

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
      assert.deepStrictEqual(
        records.get(LEGACY)?.map((r) => r.value),
        [legacyValue],
      );
      assert.deepStrictEqual(
        records.get(STABLE)?.map((r) => r.value),
        [stableValue],
      );
    });
  });

  it('skips a malformed record block without aborting neighbouring records', async () => {
    const validValue = {
      $type: STABLE,
      trackName: 'Still readable',
      artists: [{ artistName: 'Valid Artist' }],
    };
    const car = await buildRepoCar([
      {
        collection: STABLE,
        rkey: '3laaa111',
        rawBytes: new Uint8Array([0xff]),
      },
      { collection: STABLE, rkey: '3lbbb222', value: validValue },
    ]);

    await withCarFetch(car, async () => {
      const records = await fetchRepoCollectionsViaCAR(PDS, DID, [STABLE]);

      assert.strictEqual(records.get(STABLE)?.length, 1);
      assert.deepStrictEqual(records.get(STABLE)?.[0].value, validValue);
    });
  });

  it('extracts requested records when the CAR emits records and its commit after the MST', async () => {
    const value = {
      $type: STABLE,
      trackName: 'Out of order',
      artists: [{ artistName: 'Streaming Artist' }],
    };
    const car = await buildRepoCar(
      [
        { collection: STABLE, rkey: '3laaa111', value },
        {
          collection: 'app.bsky.feed.post',
          rkey: '3lbbb222',
          value: { $type: 'app.bsky.feed.post' },
        },
      ],
      true,
      true,
    );

    await withCarFetch(car, async () => {
      const records = await fetchRepoCollectionsViaCAR(PDS, DID, [STABLE]);
      assert.deepStrictEqual(
        records.get(STABLE)?.map((record) => record.value),
        [value],
      );
    });
  });
});
