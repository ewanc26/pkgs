/**
 * Validation helpers for untrusted identifiers and endpoints.
 *
 * Every DID, handle and PDS URL that reaches the server originates from a
 * request path/query string or from a remote DID document, so none of it may
 * be fetched or interpolated without being checked first. In particular the
 * `pdsUrl` query parameter on `/api/scrobbles/[did]` is fully attacker
 * controlled, so without these guards the serverless function is an open
 * SSRF proxy into the deployment's private network.
 */

/** `did:plc:` keys are 24 base32 chars; `did:web:` is a host (optionally with a path). */
const DID_PLC_RE = /^did:plc:[a-z2-7]{24}$/;
const DID_WEB_RE = /^did:web:[a-zA-Z0-9.-]+(?::[a-zA-Z0-9._~%-]+)*$/;

/** Conservative handle syntax — ASCII labels separated by dots, per the atproto spec. */
const HANDLE_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Hostnames that must never be fetched from the server. */
const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "instance-data",
]);

export function isValidDid(did: string): boolean {
  if (did.length > 2048) return false;
  return DID_PLC_RE.test(did) || DID_WEB_RE.test(did);
}

export function isValidHandle(handle: string): boolean {
  return handle.length <= 253 && HANDLE_RE.test(handle);
}

/** A DID or a handle — the two things `/profile/[did]` and `/api/resolve` accept. */
export function isValidIdentifier(identifier: string): boolean {
  return identifier.startsWith("did:")
    ? isValidDid(identifier)
    : isValidHandle(identifier);
}

/**
 * True for hosts that resolve inside a private/loopback/link-local range, or
 * that are otherwise non-routable. Only literal addresses can be checked here
 * (DNS rebinding is out of scope), but it blocks the direct-literal cases that
 * make SSRF trivial.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host.endsWith(".internal") || host.endsWith(".home.arpa")) return true;

  // IPv6 loopback / unique-local / link-local
  if (host === "::1" || host === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe80:/.test(host)) return true;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
  }

  return false;
}

/**
 * Parse and validate an endpoint the server is about to `fetch()`.
 * Returns the normalised origin-ish URL (no trailing slash) or `null`.
 */
export function safeEndpoint(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2048) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (isPrivateHost(url.hostname)) return null;

  // Only the origin plus an optional path prefix is meaningful for a PDS.
  url.hash = "";
  url.search = "";
  const normalised = url.toString();
  return normalised.endsWith("/") ? normalised.slice(0, -1) : normalised;
}
