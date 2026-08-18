/**
 * Tests for CAR-export fetching against an authenticated session.
 *
 * Regression cover for the "Cannot determine PDS URL from agent" failure: after
 * the @atproto/api → @atproto/lex migration the PDS URL and credentials moved
 * onto `client.agent`, so anything that rebuilt the request by hand broke for
 * every session shape. These tests drive a real `Client` over a stub session
 * agent and a real CARv1 file.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '@atproto/lex';
import { CarWriter } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import {
  fetchRepoViaCARWithClient,
  getPdsUrlFromAgent,
  CARFetchUnauthorizedError,
} from '@ewanc26/croft-click-core';

const DID = 'did:plc:testtesttesttesttesttest';
const COLLECTION = 'fm.teal.feed.play';
const PDS = 'https://pds.example.com';

async function block(value: unknown): Promise<{ cid: CID; bytes: Uint8Array }> {
  const bytes = dagCbor.encode(value);
  const cid = CID.createV1(dagCbor.code, await sha256.digest(bytes));
  return { cid, bytes };
}

/**
 * Build a minimal but genuine CARv1 repo export holding a single record,
 * so the walk exercises real MST decoding rather than a mocked parser.
 */
async function buildRepoCar(rkey: string, record: unknown): Promise<Uint8Array> {
  const recordBlock = await block(record);

  // Single-entry MST leaf: full key, no prefix reuse, no subtrees.
  const key = `${COLLECTION}/${rkey}`;
  const mstBlock = await block({
    l: null,
    e: [{ p: 0, k: new TextEncoder().encode(key), v: recordBlock.cid, t: null }],
  });

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
  await writer.put(recordBlock);
  await writer.close();
  await collecting;

  return new Uint8Array(Buffer.concat(chunks));
}

/**
 * Stub of the session objects an @atproto/lex Client wraps (PasswordSession /
 * OAuthSession): it owns the PDS origin and attaches its own credentials.
 */
function stubSession(opts: {
  car?: Uint8Array;
  status?: number;
  onRequest?: (path: string, init?: RequestInit) => void;
}) {
  return {
    did: DID,
    session: { service: PDS, accessJwt: 'jwt-token' },
    fetchHandler(path: string, init?: RequestInit) {
      opts.onRequest?.(path, init);
      if (opts.status && opts.status !== 200) {
        return Promise.resolve(
          new Response(null, { status: opts.status, statusText: 'Unauthorized' }),
        );
      }
      return Promise.resolve(
        new Response(opts.car, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.ipld.car' },
        }),
      );
    },
  };
}

describe('fetchRepoViaCARWithClient', () => {
  it('fetches and decodes records through the client session', async () => {
    const value = { $type: COLLECTION, trackName: 'Delete', artists: [{ artistName: 'Ninajirachi' }] };
    const car = await buildRepoCar('3labc123', value);

    const requests: string[] = [];
    const client = new Client(stubSession({ car, onRequest: (p) => requests.push(p) }) as never);

    const records = await fetchRepoViaCARWithClient(client, COLLECTION);

    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].rkey, '3labc123');
    assert.strictEqual(records[0].uri, `at://${DID}/${COLLECTION}/3labc123`);
    assert.deepStrictEqual(records[0].value, value);

    // Routed through the session as an origin-less path so it resolves the PDS.
    assert.strictEqual(requests.length, 1);
    assert.ok(requests[0].startsWith('/xrpc/com.atproto.sync.getRepo?'));
    assert.ok(requests[0].includes(encodeURIComponent(DID)));
  });

  it('accepts the bare session agent as well as a Client', async () => {
    const car = await buildRepoCar('3labc123', { $type: COLLECTION, trackName: 'x' });
    const records = await fetchRepoViaCARWithClient(stubSession({ car }), COLLECTION);
    assert.strictEqual(records.length, 1);
  });

  it('defaults to the session DID when none is given', async () => {
    const car = await buildRepoCar('3labc123', { $type: COLLECTION, trackName: 'x' });
    let seen = '';
    const client = new Client(stubSession({ car, onRequest: (p) => { seen = p; } }) as never);

    await fetchRepoViaCARWithClient(client, COLLECTION);
    assert.ok(seen.includes(encodeURIComponent(DID)));
  });

  it('surfaces a 401 as CARFetchUnauthorizedError', async () => {
    const client = new Client(stubSession({ status: 401 }) as never);
    await assert.rejects(
      () => fetchRepoViaCARWithClient(client, COLLECTION),
      (err: Error) => {
        assert.ok(err instanceof CARFetchUnauthorizedError);
        // The message should name the real PDS, not "Cannot determine PDS URL".
        assert.ok(err.message.includes(PDS), err.message);
        return true;
      },
    );
  });

  it('retries anonymously when the session credentials are refused', async () => {
    // getRepo is public per spec, so a PDS that rejects our scope may still
    // serve the export without credentials.
    const car = await buildRepoCar('3labc123', { $type: COLLECTION, trackName: 'x' });
    const anonymous: string[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      anonymous.push(String(input));
      return new Response(car, { status: 200 });
    }) as typeof fetch;

    try {
      const client = new Client(stubSession({ status: 403 }) as never);
      const records = await fetchRepoViaCARWithClient(client, COLLECTION);

      assert.strictEqual(records.length, 1);
      assert.strictEqual(anonymous.length, 1);
      assert.ok(anonymous[0].startsWith(`${PDS}/xrpc/com.atproto.sync.getRepo`), anonymous[0]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('prefers the OAuth token audience as the PDS for the anonymous retry', async () => {
    // Entryway-hosted accounts issue tokens whose audience is the real PDS,
    // which is not the same host as the authorization server issuer.
    const car = await buildRepoCar('3labc123', { $type: COLLECTION, trackName: 'x' });
    const seen: string[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      seen.push(String(input));
      return new Response(car, { status: 200 });
    }) as typeof fetch;

    try {
      const client = new Client({
        did: DID,
        serverMetadata: { issuer: 'https://entryway.example.com' },
        getTokenInfo: async () => ({ aud: PDS }),
        fetchHandler: async () => new Response(null, { status: 401 }),
      } as never);

      await fetchRepoViaCARWithClient(client, COLLECTION);
      assert.ok(seen[0].startsWith(`${PDS}/xrpc/`), seen[0]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('ignores collections the repo does not contain', async () => {
    const car = await buildRepoCar('3labc123', { $type: COLLECTION, trackName: 'x' });
    const client = new Client(stubSession({ car }) as never);
    const records = await fetchRepoViaCARWithClient(client, 'fm.teal.alpha.feed.play');
    assert.strictEqual(records.length, 0);
  });
});

describe('getPdsUrlFromAgent', () => {
  it('reads the PDS off a password session wrapped in a Client', () => {
    const client = new Client(stubSession({}) as never);
    assert.strictEqual(getPdsUrlFromAgent(client), PDS);
  });

  it('prefers the DID document endpoint over the login service URL', () => {
    const agent = {
      did: DID,
      session: {
        service: 'https://entryway.example.com',
        didDoc: {
          service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }],
        },
      },
      fetchHandler: () => Promise.resolve(new Response()),
    };
    assert.strictEqual(getPdsUrlFromAgent(new Client(agent as never)), PDS);
  });

  it('reads the issuer off an OAuth session', () => {
    const agent = {
      did: DID,
      serverMetadata: { issuer: PDS },
      fetchHandler: () => Promise.resolve(new Response()),
    };
    assert.strictEqual(getPdsUrlFromAgent(new Client(agent as never)), PDS);
  });
});
