/**
 * DID and PDS resolution for the Tourmaline API.
 *
 * Resolves handles and DIDs via Slingshot, fetches DID documents
 * from plc.directory or did:web endpoints, and retrieves basic
 * Bluesky profile info (display name, avatar) from the PDS.
 */

import { isValidDid, isValidIdentifier, safeEndpoint } from "./validate";

const SLINGSHOT_URL = "https://slingshot.microcosm.blue";

interface DidDocument {
  id: string;
  alsoKnownAs?: string[];
  service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
}

export interface IdentityResult {
  did: string;
  pdsUrl: string;
  handle?: string;
}

export interface ProfileRecord {
  displayName?: string;
  avatar?: string;
}

/** CIDv1 base32 / CIDv0 base58btc — anything else must not reach a URL. */
const CID_RE = /^(b[a-z2-7]{20,120}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/;

/**
 * Extract the CID from an avatar/banner blob reference.
 * Blob refs are untrusted record content, so the value is only returned when
 * it is a syntactically valid CID — otherwise it could be used to escape the
 * CDN path it gets interpolated into.
 */
function extractBlobCid(blob: unknown): string | null {
  if (!blob) return null;

  let candidate: unknown = null;
  if (typeof blob === "string") {
    candidate = blob;
  } else if (typeof blob === "object") {
    const obj = blob as Record<string, unknown>;
    const ref = obj.ref as Record<string, unknown> | undefined;
    if (ref && typeof ref === "object" && typeof ref.$link === "string") {
      candidate = ref.$link;
    } else if (typeof obj.cid === "string") {
      candidate = obj.cid;
    }
  }

  if (typeof candidate !== "string" || !CID_RE.test(candidate)) return null;
  return candidate;
}

export async function fetchBlueskyProfile(
  pdsUrl: string,
  did: string,
): Promise<ProfileRecord> {
  const url = `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=app.bsky.actor.profile&rkey=self`;
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = (await res.json()) as {
      value?: { displayName?: unknown; avatar?: unknown };
    };

    const avatarCid = extractBlobCid(data.value?.avatar);
    const avatar = avatarCid
      ? `https://cdn.bsky.app/img/avatar/plain/${encodeURIComponent(did)}/${avatarCid}@jpeg`
      : undefined;

    const rawName = data.value?.displayName;
    const displayName =
      typeof rawName === "string" && rawName.trim()
        ? rawName.slice(0, 128)
        : undefined;

    return { displayName, avatar };
  } catch {
    return {};
  }
}

export async function resolveIdentifier(
  identifier: string,
): Promise<IdentityResult> {
  let did: string;
  let handle: string | undefined;

  if (!isValidIdentifier(identifier)) {
    throw new Error("Not a valid DID or handle.");
  }

  if (identifier.startsWith("did:")) {
    did = identifier;
  } else {
    const res = await fetch(
      `${SLINGSHOT_URL}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(identifier)}`,
    );
    if (!res.ok)
      throw new Error(
        `Failed to resolve handle "${identifier}": ${res.status}`,
      );
    const data = (await res.json()) as { did?: unknown };
    // The resolver response is remote input — never trust it as a DID.
    if (typeof data.did !== "string" || !isValidDid(data.did)) {
      throw new Error(`Handle "${identifier}" did not resolve to a valid DID.`);
    }
    did = data.did;
    handle = identifier;
  }

  const doc = await resolveDidDocument(did);

  if (!handle) {
    handle = doc.alsoKnownAs
      ?.find((h) => h.startsWith("at://"))
      ?.replace("at://", "");
  }

  const pdsService = doc.service?.find((s) => s.id === "#atproto_pds");

  // The serviceEndpoint comes from a remote DID document: it must be a public
  // https origin before the server will ever fetch it.
  const pdsUrl = safeEndpoint(pdsService?.serviceEndpoint);
  if (!pdsUrl) {
    throw new Error("No usable https PDS endpoint found in DID document");
  }

  return { did, pdsUrl, handle };
}

async function resolveDidDocument(did: string): Promise<DidDocument> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    if (did.startsWith("did:plc:")) {
      const res = await fetch(`https://plc.directory/${did}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to resolve DID: ${res.status}`);
      return await res.json();
    }

    if (did.startsWith("did:web:")) {
      // did:web:example.com          -> https://example.com/.well-known/did.json
      // did:web:example.com:a:b      -> https://example.com/a/b/did.json
      const [host, ...segments] = did.slice("did:web:".length).split(":");
      const path = segments.length
        ? `/${segments.map(decodeURIComponent).map(encodeURIComponent).join("/")}/did.json`
        : "/.well-known/did.json";

      // Guard against did:web values pointing at loopback/private hosts.
      const origin = safeEndpoint(`https://${decodeURIComponent(host)}`);
      if (!origin) throw new Error(`Unsupported did:web host in ${did}`);

      const res = await fetch(`${origin}${path}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to resolve DID: ${res.status}`);
      return await res.json();
    }

    throw new Error(`Unsupported DID method: ${did}`);
  } finally {
    clearTimeout(timeout);
  }
}
