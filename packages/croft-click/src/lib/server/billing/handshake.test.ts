import { describe, expect, it } from "vitest";
import {
  createChallenge,
  HANDSHAKE_COLLECTION,
  isAtprotoDid,
  verifyHandshake,
} from "./handshake";

const USER = "did:plc:abcdefghijklmnopqrstuvwx";
const OTHER = "did:plc:zyxwvutsrqponmlkjihgfedc";
const SERVICE = "did:web:croft.click";
const NOW = new Date("2026-11-14T12:00:00Z");

function recordFor(nonce: string, service = SERVICE) {
  return {
    $type: HANDSHAKE_COLLECTION,
    service,
    nonce,
    createdAt: NOW.toISOString(),
  };
}

describe("isAtprotoDid", () => {
  it("accepts did:plc and did:web", () => {
    expect(isAtprotoDid(USER)).toBe(true);
    expect(isAtprotoDid(SERVICE)).toBe(true);
  });

  it("rejects handles and other DID methods", () => {
    expect(isAtprotoDid("ewancroft.uk")).toBe(false);
    expect(isAtprotoDid("did:key:z6Mkabc")).toBe(false);
    expect(isAtprotoDid("did:plc:short")).toBe(false);
  });
});

describe("createChallenge", () => {
  it("returns a fresh random nonce and stores only its hash", () => {
    const a = createChallenge({ did: USER, serviceDid: SERVICE, now: NOW });
    const b = createChallenge({ did: USER, serviceDid: SERVICE, now: NOW });

    expect(a.challenge.nonce).not.toBe(b.challenge.nonce);
    expect(a.challenge.nonce.length).toBeGreaterThanOrEqual(43);
    expect(JSON.stringify(a.stored)).not.toContain(a.challenge.nonce);
    expect(a.challenge.expiresAt).toBe("2026-11-14T12:10:00.000Z");
  });

  it("refuses a handle in place of a DID", () => {
    expect(() =>
      createChallenge({ did: "ewancroft.uk", serviceDid: SERVICE }),
    ).toThrow();
  });

  it("refuses long-lived challenges", () => {
    expect(() =>
      createChallenge({ did: USER, serviceDid: SERVICE, ttlSeconds: 86_400 }),
    ).toThrow();
  });
});

describe("verifyHandshake", () => {
  const { challenge, stored } = createChallenge({
    did: USER,
    serviceDid: SERVICE,
    now: NOW,
  });

  it("accepts the nonce written to the challenged DID's repository", () => {
    const result = verifyHandshake({
      stored,
      repoDid: USER,
      record: recordFor(challenge.nonce),
      now: NOW,
    });
    expect(result).toEqual({ ok: true, did: USER });
  });

  it("rejects the right nonce read from someone else's repository", () => {
    const result = verifyHandshake({
      stored,
      repoDid: OTHER,
      record: recordFor(challenge.nonce),
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "repo-mismatch" });
  });

  it("rejects a wrong nonce", () => {
    const result = verifyHandshake({
      stored,
      repoDid: USER,
      record: recordFor("not-the-nonce"),
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "nonce-mismatch" });
  });

  it("rejects a record addressed to another service", () => {
    const result = verifyHandshake({
      stored,
      repoDid: USER,
      record: recordFor(challenge.nonce, "did:web:example.com"),
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "wrong-service" });
  });

  it("rejects records of the wrong type", () => {
    const result = verifyHandshake({
      stored,
      repoDid: USER,
      record: { ...recordFor(challenge.nonce), $type: "app.bsky.feed.post" },
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "malformed-record" });
  });

  it("rejects expired and already-used challenges", () => {
    const later = new Date(NOW.getTime() + 600_000);
    expect(
      verifyHandshake({
        stored,
        repoDid: USER,
        record: recordFor(challenge.nonce),
        now: later,
      }),
    ).toEqual({ ok: false, reason: "expired" });

    expect(
      verifyHandshake({
        stored: { ...stored, consumedAt: NOW.getTime() },
        repoDid: USER,
        record: recordFor(challenge.nonce),
        now: NOW,
      }),
    ).toEqual({ ok: false, reason: "already-used" });
  });
});
