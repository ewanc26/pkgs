import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * DID-control proof for browser-only tools.
 *
 * The croft.click tools sign in with public browser OAuth clients, so the
 * server never holds a token it could check. Instead the server issues a
 * short-lived nonce for a DID, the browser writes it into the user's own
 * repository as a `click.croft.handshake` record, and the server reads that
 * record back from the PDS it resolved for the DID itself. Only someone who
 * can write to the DID's repository can complete the handshake.
 *
 * See docs/billing.md for the full flow and what remains to be decided.
 */

export const HANDSHAKE_COLLECTION = "click.croft.handshake";
export const DEFAULT_CHALLENGE_TTL_SECONDS = 600;

const PLC_DID = /^did:plc:[a-z2-7]{24}$/;
const WEB_DID = /^did:web:[a-z0-9.-]+$/i;

/** True for the two DID methods AT Protocol supports (did:plc, did:web). */
export function isAtprotoDid(value: unknown): value is string {
  return (
    typeof value === "string" && (PLC_DID.test(value) || WEB_DID.test(value))
  );
}

/** Sent to the client, which writes `nonce` into a handshake record. */
export interface Challenge {
  did: string;
  service: string;
  nonce: string;
  expiresAt: string;
}

/**
 * Kept server-side. Only a hash of the nonce is stored, so a leaked
 * challenge table can't be replayed. Storage must mark a challenge consumed
 * atomically (for example `DELETE ... RETURNING`) when it is used.
 */
export interface StoredChallenge {
  did: string;
  service: string;
  nonceHash: string;
  expiresAt: number;
  consumedAt?: number;
}

function hashNonce(nonce: string): string {
  return createHash("sha256").update(nonce, "utf8").digest("hex");
}

export function createChallenge(input: {
  did: string;
  serviceDid: string;
  now?: Date;
  ttlSeconds?: number;
}): { challenge: Challenge; stored: StoredChallenge } {
  if (!isAtprotoDid(input.did)) throw new Error("Unsupported DID");
  if (!isAtprotoDid(input.serviceDid))
    throw new Error("Unsupported service DID");

  const now = (input.now ?? new Date()).getTime();
  const ttl = input.ttlSeconds ?? DEFAULT_CHALLENGE_TTL_SECONDS;
  if (!Number.isInteger(ttl) || ttl <= 0 || ttl > 3600) {
    throw new Error("Challenge lifetime must be between 1 and 3600 seconds");
  }

  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = now + ttl * 1000;
  return {
    challenge: {
      did: input.did,
      service: input.serviceDid,
      nonce,
      expiresAt: new Date(expiresAt).toISOString(),
    },
    stored: {
      did: input.did,
      service: input.serviceDid,
      nonceHash: hashNonce(nonce),
      expiresAt,
    },
  };
}

export type HandshakeFailure =
  | "repo-mismatch"
  | "malformed-record"
  | "wrong-service"
  | "nonce-mismatch"
  | "expired"
  | "already-used";

export type HandshakeResult =
  | { ok: true; did: string }
  | { ok: false; reason: HandshakeFailure };

/**
 * Checks a handshake record against a stored challenge.
 *
 * `repoDid` must be the DID whose repository the server read the record
 * from, using a PDS the server resolved from the DID document. Never take
 * the DID, record URI or PDS from the client: a handle, a client-supplied
 * URI or an unverified DID string is not proof of anything.
 */
export function verifyHandshake(input: {
  stored: StoredChallenge;
  repoDid: string;
  record: unknown;
  now?: Date;
}): HandshakeResult {
  const { stored, repoDid, record } = input;
  const now = (input.now ?? new Date()).getTime();

  if (stored.consumedAt !== undefined)
    return { ok: false, reason: "already-used" };
  if (now >= stored.expiresAt) return { ok: false, reason: "expired" };
  if (repoDid !== stored.did) return { ok: false, reason: "repo-mismatch" };

  if (!record || typeof record !== "object") {
    return { ok: false, reason: "malformed-record" };
  }
  const value = record as Record<string, unknown>;
  if (
    value.$type !== HANDSHAKE_COLLECTION ||
    typeof value.service !== "string" ||
    typeof value.nonce !== "string"
  ) {
    return { ok: false, reason: "malformed-record" };
  }
  if (value.service !== stored.service)
    return { ok: false, reason: "wrong-service" };

  const expected = Buffer.from(stored.nonceHash, "hex");
  const actual = Buffer.from(hashNonce(value.nonce), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "nonce-mismatch" };
  }

  return { ok: true, did: stored.did };
}
