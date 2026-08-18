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

  return parseCAR(new Uint8Array(await response.arrayBuffer()), did, collection);
}

/** Decode a CARv1 repo export and extract every record in `collection`. */
async function parseCAR(carBytes: Uint8Array, did: string, collection: string): Promise<CARRecord[]> {
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
 * Minimal shape of the session object an @atproto/lex `Client` wraps.
 * Both PasswordSession and OAuthSession satisfy this.
 */
interface AgentLike {
  did?: string;
  fetchHandler(path: string, init?: RequestInit): Promise<Response>;
  /** OAuthSession only — reports the true PDS as the token audience. */
  getTokenInfo?(refresh?: boolean | 'auto'): Promise<{ aud?: string }>;
}

/**
 * Unwrap the request-issuing agent from an @atproto/lex `Client`.
 *
 * `Client` delegates every request to `client.agent`, which is the
 * PasswordSession or OAuthSession that actually knows the PDS URL and holds
 * the credentials. Callers may pass either the Client or the bare agent.
 */
function asAgent(clientOrAgent: unknown): AgentLike | undefined {
  const c = clientOrAgent as Record<string, unknown> | undefined;
  if (!c) return undefined;

  const inner = c['agent'] as Record<string, unknown> | undefined;
  if (inner && typeof inner['fetchHandler'] === 'function') return inner as unknown as AgentLike;
  if (typeof c['fetchHandler'] === 'function') return c as unknown as AgentLike;

  return undefined;
}

/**
 * Best-effort PDS base URL for a Client, agent, or legacy @atproto/api Agent.
 *
 * Only used for diagnostics now — {@link fetchRepoViaCARWithClient} routes
 * through the agent's own fetch handler rather than rebuilding the URL, since
 * the handler already resolves the PDS (including the didDoc override that a
 * PasswordSession applies after login).
 */
export function getPdsUrlFromAgent(clientOrAgent: unknown): string {
  const c = clientOrAgent as Record<string, unknown>;
  const agent = (c?.['agent'] as Record<string, unknown> | undefined) ?? c;

  // @atproto/lex PasswordSession: session data carries the PDS it logged in to,
  // with the DID document's endpoint taking precedence once resolved.
  const session = agent?.['session'] as Record<string, unknown> | undefined;
  const didDocPds = pdsFromDidDoc(session?.['didDoc']);
  if (didDocPds) return didDocPds;
  if (typeof session?.['service'] === 'string') return session['service'];

  // OAuth session: the authorization server metadata issuer doubles as the PDS
  // base URL for PDS-hosted authorization servers.
  const issuer =
    (agent?.['serverMetadata'] as any)?.issuer ??
    (c?.['sessionManager'] as any)?.serverMetadata?.issuer;
  if (issuer) return issuer.toString();

  // Legacy AtpAgent / password-auth agent: direct URL fields.
  for (const field of ['service', 'dispatchUrl', 'pdsUrl', 'serviceUrl']) {
    const v = agent?.[field] ?? c?.[field] ?? (c?.['sessionManager'] as any)?.[field];
    if (typeof v === 'string' && v) return v;
    if (v instanceof URL) return v.toString();
  }

  throw new Error('Cannot determine PDS URL from agent');
}

/** Pull the #atproto_pds service endpoint out of a DID document, if present. */
function pdsFromDidDoc(didDoc: unknown): string | undefined {
  const services = (didDoc as { service?: unknown })?.service;
  if (!Array.isArray(services)) return undefined;
  for (const svc of services) {
    const s = svc as { id?: string; type?: string; serviceEndpoint?: unknown };
    const id = s?.id;
    if ((id === '#atproto_pds' || id?.endsWith('#atproto_pds')) && typeof s.serviceEndpoint === 'string') {
      return s.serviceEndpoint;
    }
  }
  return undefined;
}

/**
 * Fetch a repo as a CAR file using an authenticated client's own transport.
 *
 * This is the preferred entry point for any signed-in flow. Delegating to
 * `client.agent.fetchHandler` means the session resolves the PDS origin and
 * attaches credentials itself — Bearer for password sessions, DPoP-bound
 * tokens for OAuth — and transparently refreshes and retries on an expired
 * token. Reconstructing the URL and token by hand (as this module used to do)
 * cannot work for OAuth, whose access tokens are never exposed.
 *
 * @param clientOrAgent An @atproto/lex Client, or the session agent directly.
 * @param did           Repo to export. Defaults to the authenticated user.
 */
export async function fetchRepoViaCARWithClient(
  clientOrAgent: unknown,
  collection: string,
  did?: string,
  signal?: AbortSignal,
): Promise<CARRecord[]> {
  const agent = asAgent(clientOrAgent);
  if (!agent) {
    throw new Error('Cannot fetch repo: client has no usable session agent');
  }

  const repoDid = did ?? agent.did;
  if (!repoDid) {
    throw new Error('Cannot fetch repo: no DID available from the session');
  }

  const path = `/xrpc/com.atproto.sync.getRepo?did=${encodeURIComponent(repoDid)}`;
  const headers = { Accept: 'application/vnd.ipld.car' };

  const response = await agent.fetchHandler(path, { headers, signal });

  if (response.ok) {
    return parseCAR(new Uint8Array(await response.arrayBuffer()), repoDid, collection);
  }

  // com.atproto.sync.getRepo is public per spec, so a PDS that refuses our
  // credentials (an OAuth scope that does not cover the sync namespace, say)
  // may still serve the export anonymously. Worth one unauthenticated retry
  // before giving up.
  if (response.status === 401 || response.status === 403) {
    const pdsUrl = await resolvePdsUrl(clientOrAgent);
    if (pdsUrl) {
      try {
        return await fetchRepoViaCAR(pdsUrl, repoDid, collection, signal);
      } catch {
        // Anonymous retry failed too — report the original refusal below.
      }
    }
    throw new CARFetchUnauthorizedError(pdsUrl ?? 'the PDS', repoDid);
  }

  throw new Error(`CAR fetch failed: ${response.status} ${response.statusText}`);
}

/**
 * Resolve the PDS base URL, never throwing.
 *
 * An OAuth session reports the true PDS as its token audience, which matters
 * for entryway-hosted accounts where the issuer and the PDS differ.
 */
async function resolvePdsUrl(clientOrAgent: unknown): Promise<string | undefined> {
  const agent = asAgent(clientOrAgent);
  if (typeof agent?.getTokenInfo === 'function') {
    try {
      const aud = (await agent.getTokenInfo('auto'))?.aud;
      if (aud) return aud;
    } catch {
      // Fall through to the synchronous best-effort lookup.
    }
  }

  try {
    return getPdsUrlFromAgent(clientOrAgent);
  } catch {
    return undefined;
  }
}

/**
 * Extract a Bearer token from a client for authenticated CAR fetches.
 *
 * Prefer {@link fetchRepoViaCARWithClient}, which lets the session attach its
 * own credentials. This helper only covers bearer-token shapes: an OAuth
 * session's access token is DPoP-bound and deliberately not exposed, so it
 * returns undefined there.
 *
 * - @atproto/lex Client backed by PasswordSession: client.agent.session.accessJwt
 * - Legacy @atproto/api Agent: agent.session.accessJwt
 */
export async function getAgentToken(clientOrAgent: unknown): Promise<string | undefined> {
  const a = clientOrAgent as Record<string, unknown>;
  const agent = (a?.['agent'] as Record<string, unknown> | undefined) ?? a;

  // @atproto/lex PasswordSession / legacy AtpAgent: session.accessJwt is the JWT.
  const jwt = (agent?.['session'] as any)?.accessJwt ?? (a?.['session'] as any)?.accessJwt;
  if (jwt) return jwt as string;

  // Legacy OAuth agent: session manager exposes getTokens() (non-mutating read).
  const sm = (a?.['sessionManager'] as any);
  if (typeof sm?.getTokens === 'function') {
    try {
      const tokens = await sm.getTokens() as { accessToken?: string } | null;
      if (tokens?.accessToken) return tokens.accessToken;
    } catch {
      // Token read failed — try a silent refresh before giving up.
    }

    // If getTokens() returned nothing (expired session), attempt a silent
    // refresh via the session manager and retry once.
    if (typeof sm?.refresh === 'function') {
      try {
        await sm.refresh();
        const refreshed = await sm.getTokens() as { accessToken?: string } | null;
        if (refreshed?.accessToken) return refreshed.accessToken;
      } catch {
        // Refresh failed — fall through and return undefined.
      }
    }
  }

  return undefined;
}
