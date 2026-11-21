import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CarWriter } from "@ipld/car";
import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import type { Client } from "@atproto/lex";
import { fetchExistingRecords, clearExistingRecordsCache } from "../sync.js";

const DID = "did:plc:synccachetesttesttesttest";

async function block(value: unknown): Promise<{ cid: CID; bytes: Uint8Array }> {
  const bytes = dagCbor.encode(value);
  return { cid: CID.createV1(dagCbor.code, await sha256.digest(bytes)), bytes };
}

/** A CAR export of a repo with no records. */
async function emptyRepoCar(): Promise<Uint8Array> {
  const mst = await block({ l: null, e: [] });
  const commit = await block({
    version: 3,
    did: DID,
    data: mst.cid,
    rev: "3labcdefghijk",
    sig: new Uint8Array([1, 2, 3]),
  });
  const { writer, out } = CarWriter.create([commit.cid]);
  const chunks: Uint8Array[] = [];
  const collecting = (async () => {
    for await (const chunk of out) chunks.push(chunk);
  })();
  await writer.put(commit);
  await writer.put(mst);
  await writer.close();
  await collecting;
  return new Uint8Array(Buffer.concat(chunks));
}

/** A client stub whose fetch handler serves the CAR and counts requests. */
async function stubClient(): Promise<{ client: Client; requests: () => number }> {
  const car = await emptyRepoCar();
  let count = 0;
  const client = {
    assertDid: DID,
    fetchHandler: async () => {
      count++;
      return new Response(car as unknown as BodyInit, {
        status: 200,
        headers: { "Content-Type": "application/vnd.ipld.car" },
      });
    },
  } as unknown as Client;
  return { client, requests: () => count };
}

describe("fetchExistingRecords session cache", () => {
  it("reuses the snapshot until it is cleared, then re-fetches (#98)", async () => {
    clearExistingRecordsCache();
    const { client, requests } = await stubClient();

    await fetchExistingRecords(client);
    const afterFirst = requests();
    assert.ok(afterFirst > 0, "first call fetches the repo");

    await fetchExistingRecords(client);
    assert.equal(requests(), afterFirst, "second call is served from the cache");

    // Publishing invalidates the snapshot, so the next sync must see the repo
    // as it is now rather than as it was before the interrupted run.
    clearExistingRecordsCache(DID);
    await fetchExistingRecords(client);
    assert.equal(requests(), afterFirst * 2, "cleared cache forces a re-fetch");
  });

  it("clears every DID when called without one", async () => {
    clearExistingRecordsCache();
    const { client, requests } = await stubClient();

    await fetchExistingRecords(client);
    const afterFirst = requests();
    clearExistingRecordsCache();
    await fetchExistingRecords(client);
    assert.equal(requests(), afterFirst * 2);
  });
});
