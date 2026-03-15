/**
 * ATProto authentication — environment-agnostic.
 * No CLI prompts; credentials come from the caller.
 */

import { Agent, AtpAgent } from '@atproto/api';
import { SLINGSHOT_RESOLVER } from './config.js';

export interface ResolvedIdentity {
  did: string;
  handle: string;
  pds: string;
}

/**
 * Resolve a did:web DID by fetching its DID document directly.
 *
 * did:web:example.com        → https://example.com/.well-known/did.json
 * did:web:example.com:a:b   → https://example.com/a/b/did.json
 */
async function resolveDidWeb(did: string): Promise<ResolvedIdentity> {
  const withoutPrefix = did.slice('did:web:'.length);
  const parts = withoutPrefix.split(':').map(decodeURIComponent);
  const domain = parts[0];

  const url =
    parts.length === 1
      ? `https://${domain}/.well-known/did.json`
      : `https://${domain}/${parts.slice(1).join('/')}/did.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch did:web document at ${url}: ${res.status} ${res.statusText}`);
  }

  const doc = (await res.json()) as {
    id: string;
    alsoKnownAs?: string[];
    service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
  };

  const pdsService = doc.service?.find((s) => s.id === '#atproto_pds');
  if (!pdsService) {
    throw new Error(`No ATProto PDS service (#atproto_pds) found in DID document for ${did}`);
  }

  // Prefer the at:// alias as the canonical handle; fall back to the DID itself.
  const handle =
    doc.alsoKnownAs?.find((aka) => aka.startsWith('at://'))?.slice('at://'.length) ?? did;

  return { did, handle, pds: pdsService.serviceEndpoint };
}

/**
 * Resolve an AT Protocol handle or DID to its PDS URL.
 *
 * - did:web identifiers are resolved by fetching the DID document directly.
 * - Everything else (handles and did:plc DIDs) is resolved via the Slingshot resolver.
 */
export async function resolveIdentity(
  identifier: string,
  resolverBase = SLINGSHOT_RESOLVER
): Promise<ResolvedIdentity> {
  if (identifier.startsWith('did:web:')) {
    return resolveDidWeb(identifier);
  }

  const url = `${resolverBase}/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to resolve identity: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as ResolvedIdentity;
  if (!data.did || !data.pds) {
    throw new Error('Invalid response from identity resolver');
  }
  return data;
}

/**
 * Log in to ATProto.
 * - If `pdsOverride` is supplied, skips identity resolution and hits that PDS directly.
 * - Otherwise uses the Slingshot resolver to find the correct PDS.
 */
export async function login(
  identifier: string,
  password: string,
  pdsOverride?: string
): Promise<Agent> {
  if (pdsOverride) {
    const agent = new AtpAgent({ service: pdsOverride });
    await agent.login({ identifier, password });
    return agent;
  }

  const identity = await resolveIdentity(identifier);
  const agent = new AtpAgent({ service: identity.pds });
  await agent.login({ identifier: identity.did, password });
  return agent;
}
