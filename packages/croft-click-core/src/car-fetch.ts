/**
 * CAR export fetcher for ATProto repos — environment-agnostic.
 *
 * Calls com.atproto.sync.getRepo (sync namespace) which sits on a separate,
 * far more generous rate-limit envelope from the AppView.  One HTTP request
 * downloads the entire repo as a CARv1 file; records are parsed locally.
 *
 * Dependencies: @ipld/car  @ipld/dag-cbor  multiformats
 */

import { CarReader } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import type { CID } from 'multiformats';

// ─── ATProto repo CBOR shapes ─────────────────────────────────────────────────

interface RepoCommit {
  version: number;
  did: string;
  data: CID; // MST root
  rev: string;
  sig: Uint8Array;
}

interface MSTNode {
  l: CID | null;
  e: Array<{
    p: number;       // bytes of previous key to reuse as prefix
    k: Uint8Array;   // key suffix bytes
    v: CID;          // record CID
    t: CID | null;   // right subtree CID
  }>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function cidStr(cid: CID): string {
  return cid.toString();
}

async function buildBlockMap(reader: CarReader): Promise<Map<string, Uint8Array>> {
  const blocks = new Map<string, Uint8Array>();
  for await (const { cid, bytes } of reader.blocks()) {
    blocks.set(cidStr(cid), bytes);
  }
  return blocks;
}

async function walkMST(
  rootCid: CID,
  blocks: Map<string, Uint8Array>,
  collection: string,
  onRecord: (rkey: string, cid: string, value: unknown) => void,
  prevKey = '',
): Promise<string> {
  const nodeBytes = blocks.get(cidStr(rootCid));
  if (!nodeBytes) return prevKey;

  const node = dagCbor.decode(nodeBytes) as MSTNode;
  let currentKey = prevKey;

  if (node.l) {
    currentKey = await walkMST(node.l, blocks, collection, onRecord, currentKey);
  }

  for (const entry of node.e ?? []) {
    const fullKey = currentKey.slice(0, entry.p) + new TextDecoder().decode(entry.k);
    currentKey = fullKey;

    const collPrefix = collection + '/';
    if (fullKey.startsWith(collPrefix)) {
      const rkey = fullKey.slice(collPrefix.length);
      const valBytes = blocks.get(cidStr(entry.v));
      if (valBytes) {
        try {
          onRecord(rkey, cidStr(entry.v), dagCbor.decode(valBytes));
        } catch {
          // malformed block — skip silently
        }
      }
    }

    if (entry.t) {
      currentKey = await walkMST(entry.t, blocks, collection, onRecord, currentKey);
    }
  }

  return currentKey;
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Thrown when the PDS returns 401 on com.atproto.sync.getRepo.
 * Callers can catch this specifically to surface a re-auth prompt rather than
 * treating it as a generic network error.
 */
export class CARFetchUnauthorizedError extends Error {
  constructor(pdsUrl: string, did: string) {
    super(
      `CAR fetch returned 401 Unauthorized for ${did} at ${pdsUrl}. ` +
      `The PDS requires authentication but a valid token could not be obtained. ` +
      `Try signing out and back in to refresh your session.`
    );
    this.name = 'CARFetchUnauthorizedError';
  }
}

export interface CARRecord {
  rkey: string;
  uri: string;
  cid: string;
  value: unknown;
}

type AgentLike = Record<string, any>;

/**
 * Return the object that may contain the actual authenticated agent first.
 *
 * `@atproto/lex` wraps password and OAuth agents in `Client.agent`.  The
 * wrapper's `service` is a service-proxy setting, not necessarily the user's
 * PDS, so callers must inspect the underlying agent before the wrapper.
 */
function getAgentCandidates(agent: unknown): AgentLike[] {
  if (
    (typeof agent !== "object" && typeof agent !== "function") ||
    agent === null
  ) {
    return [];
  }

  const root = agent as AgentLike;
  const nested = root['agent'];
  if (
    (typeof nested === "object" || typeof nested === "function") &&
    nested !== null
  ) {
    return [nested as AgentLike, root];
  }

  return [root];
}

function getOAuthIssuer(agent: AgentLike): string | undefined {
  const sessionManagerIssuer = agent['sessionManager']?.serverMetadata?.issuer;
  if (sessionManagerIssuer) return sessionManagerIssuer.toString();

  // Current @atproto/oauth-client sessions expose the same metadata directly.
  const issuer = agent['serverMetadata']?.issuer;
  if (issuer) return issuer.toString();

  return undefined;
}

/**
 * Fetch a user's entire ATProto repo as a CAR file and extract all records
 * from `collection`.
 *
 * @param token   Optional Bearer token — some PDS instances require auth on
 *                com.atproto.sync.getRepo even though the spec marks it public.
 * @param signal  Optional AbortSignal — cancels the download mid-flight.
 */
export async function fetchRepoViaCAR(
  pdsUrl: string,
  did: string,
  collection: string,
  signal?: AbortSignal,
  token?: string,
): Promise<CARRecord[]> {
  const url = `${pdsUrl.replace(/\/$/, '')}/xrpc/com.atproto.sync.getRepo?did=${encodeURIComponent(did)}`;

  const headers: Record<string, string> = { Accept: 'application/vnd.ipld.car' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { headers, signal });

  if (!response.ok) {
    if (response.status === 401) {
      throw new CARFetchUnauthorizedError(pdsUrl, did);
    }
    throw new Error(`CAR fetch failed: ${response.status} ${response.statusText}`);
  }

  const carBytes = new Uint8Array(await response.arrayBuffer());
  const reader = await CarReader.fromBytes(carBytes);
  const blocks = await buildBlockMap(reader);

  const [rootCid] = await reader.getRoots();
  if (!rootCid) throw new Error('CAR file has no roots');

  const commitBytes = blocks.get(cidStr(rootCid));
  if (!commitBytes) throw new Error('Commit block missing from CAR');

  const commit = dagCbor.decode(commitBytes) as RepoCommit;
  if (!commit.data) throw new Error('Commit has no MST root CID');

  const results: CARRecord[] = [];
  await walkMST(commit.data, blocks, collection, (rkey, cid, value) => {
    results.push({ rkey, uri: `at://${did}/${collection}/${rkey}`, cid, value });
  });

  return results;
}

/**
 * Extract the PDS base URL from an @atproto/lex Client or legacy @atproto/api Agent.
 * Handles both password-auth clients and OAuth session-manager clients.
 */
export function getPdsUrlFromAgent(agent: unknown): string {
  const candidates = getAgentCandidates(agent);

  for (const candidate of candidates) {
    const issuer = getOAuthIssuer(candidate);
    if (issuer) return issuer;

    // PasswordSession keeps the PDS used for authentication in session.service.
    const sessionService = candidate['session']?.service;
    if (sessionService) return sessionService.toString();

    // Legacy AtpAgent / password-auth agent: direct URL fields.
    for (const field of ['dispatchUrl', 'pdsUrl', 'serviceUrl']) {
      const value = candidate[field] ?? candidate['sessionManager']?.[field];
      if (value) return value.toString();
    }

    // A plain legacy agent may expose its service directly.  Do not read
    // Client.service here: for @atproto/lex that is a proxy configuration.
    if (!candidate['agent'] && candidate['service']) {
      return candidate['service'].toString();
    }
  }

  throw new Error('Cannot determine PDS URL from agent');
}

/**
 * Extract a Bearer token from a client for authenticated CAR fetches.
 *
 * Some PDS instances return 401 on com.atproto.sync.getRepo without auth,
 * even though the spec marks it public.  This helper covers both auth shapes:
 *
 * - @atproto/lex Client backed by PasswordSession: session.accessJwt
 * - Legacy @atproto/api Agent: agent.session.accessJwt
 * - OAuth (browser): agent.sessionManager.getTokens() → accessToken
 */
export async function getAgentToken(agent: unknown): Promise<string | undefined> {
  for (const candidate of getAgentCandidates(agent)) {
    // PasswordSession and legacy AtpAgent expose the access JWT through
    // session.accessJwt.
    const jwt = candidate['session']?.accessJwt;
    if (jwt) return jwt as string;

    // OAuth agent: session manager exposes getTokens() (non-mutating read).
    const sm = candidate['sessionManager'];
    if (typeof sm?.getTokens === 'function') {
      try {
        const tokens = (await sm.getTokens()) as {
          accessToken?: string;
        } | null;
        if (tokens?.accessToken) return tokens.accessToken;
      } catch {
        // Token read failed — try a silent refresh before giving up.
      }

      // If getTokens() returned nothing (expired session), attempt a silent
      // refresh via the session manager and retry once.
      if (typeof sm?.refresh === 'function') {
        try {
          await sm.refresh();
          const refreshed = (await sm.getTokens()) as {
            accessToken?: string;
          } | null;
          if (refreshed?.accessToken) return refreshed.accessToken;
        } catch {
          // Refresh failed — fall through and try the next candidate.
        }
      }
    }
  }

  return undefined;
}
