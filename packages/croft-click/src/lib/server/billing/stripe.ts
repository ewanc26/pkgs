import { createHmac, timingSafeEqual } from "node:crypto";
import { isAtprotoDid } from "./handshake";

/**
 * Stripe webhook verification and subscription state, without the Stripe
 * SDK. The signature scheme matches `stripe.webhooks.constructEvent` in
 * stripe-node 23.x: HMAC-SHA256 (hex) of `${t}.${rawBody}` keyed with the
 * endpoint's signing secret, compared against every `v1` entry in the
 * `Stripe-Signature` header, with a 300-second default tolerance.
 *
 * Entitlement is derived only from subscription objects that arrive in
 * verified webhooks. Client-side payment state is never trusted.
 */

export const DEFAULT_TOLERANCE_SECONDS = 300;

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: { object: unknown };
}

/**
 * Verifies a webhook delivery and returns the parsed event.
 *
 * `payload` must be the raw request body exactly as received
 * (`await request.text()`), not re-serialised JSON.
 */
export function constructStripeEvent(input: {
  payload: string;
  header: string | null;
  secret: string;
  now?: Date;
  toleranceSeconds?: number;
}): StripeEvent {
  const { payload, header, secret } = input;
  if (!secret.trim()) throw new WebhookSignatureError("Missing signing secret");
  if (!header)
    throw new WebhookSignatureError("Missing Stripe-Signature header");

  let timestamp = -1;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = Number.parseInt(value ?? "", 10);
    if (key === "v1" && value) signatures.push(value);
  }
  if (!Number.isFinite(timestamp) || timestamp < 0 || !signatures.length) {
    throw new WebhookSignatureError("Malformed Stripe-Signature header");
  }

  const expected = Buffer.from(
    createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`, "utf8")
      .digest("hex"),
    "utf8",
  );
  const matched = signatures.some((signature) => {
    const candidate = Buffer.from(signature, "utf8");
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  });
  if (!matched) throw new WebhookSignatureError("No matching signature");

  const tolerance = input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (tolerance > 0 && nowSeconds - timestamp > tolerance) {
    throw new WebhookSignatureError("Timestamp outside the tolerance window");
  }

  const event = JSON.parse(payload) as Partial<StripeEvent>;
  if (
    typeof event.id !== "string" ||
    typeof event.type !== "string" ||
    typeof event.created !== "number" ||
    !event.data
  ) {
    throw new WebhookSignatureError("Signed payload is not a Stripe event");
  }
  return event as StripeEvent;
}

/**
 * The private, server-side record of one Stripe subscription. This is the
 * minimal DID mapping: it never goes into a public AT Protocol record.
 */
export interface SubscriptionSnapshot {
  subscriptionId: string;
  customerId: string;
  did: string;
  status: string;
  /** Unix seconds. Latest `current_period_end` across subscription items. */
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  lastEventId: string;
  lastEventCreated: number;
}

export type ApplyResult =
  | { action: "applied"; snapshot: SubscriptionSnapshot }
  | {
      action: "ignored";
      reason:
        | "not-a-subscription-event"
        | "duplicate"
        | "stale"
        | "already-ended";
    }
  | {
      action: "rejected";
      reason: "malformed" | "missing-did" | "did-mismatch";
    };

/** Stripe never moves a subscription out of these. */
const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

/** Statuses that grant access until the end of the paid period. */
const ENTITLED_STATUSES = new Set(["active", "trialing"]);

function readPeriodEnd(
  subscription: Record<string, unknown>,
): number | undefined {
  // Since API version 2025-03-31 the period lives on each subscription item.
  const items = (subscription.items as { data?: unknown } | undefined)?.data;
  let latest: number | undefined;
  if (Array.isArray(items)) {
    for (const item of items) {
      const end = (item as { current_period_end?: unknown })
        ?.current_period_end;
      if (typeof end === "number" && (latest === undefined || end > latest))
        latest = end;
    }
  }
  // Older pinned API versions still put it on the subscription.
  if (
    latest === undefined &&
    typeof subscription.current_period_end === "number"
  ) {
    latest = subscription.current_period_end;
  }
  return latest;
}

/**
 * Folds one verified `customer.subscription.*` event into the stored
 * snapshot for that subscription. Safe to call with retried, duplicated or
 * out-of-order deliveries: the same event twice is a no-op, an event older
 * than the last one applied is ignored, and an ended subscription stays
 * ended.
 *
 * The DID comes from `subscription.metadata.did`, which the Checkout
 * Session sets from the server-verified DID (`subscription_data.metadata`).
 * A subscription without one is rejected rather than guessed at.
 */
export function applySubscriptionEvent(
  previous: SubscriptionSnapshot | undefined,
  event: StripeEvent,
): ApplyResult {
  const object = event.data.object as Record<string, unknown> | null;
  if (
    !event.type.startsWith("customer.subscription.") ||
    !object ||
    object.object !== "subscription"
  ) {
    return { action: "ignored", reason: "not-a-subscription-event" };
  }

  const subscriptionId = object.id;
  const customer = object.customer;
  const customerId =
    typeof customer === "string"
      ? customer
      : (customer as { id?: unknown } | null)?.id;
  const status = object.status;
  const periodEnd = readPeriodEnd(object);
  if (
    typeof subscriptionId !== "string" ||
    typeof customerId !== "string" ||
    typeof status !== "string" ||
    periodEnd === undefined
  ) {
    return { action: "rejected", reason: "malformed" };
  }

  if (previous) {
    if (previous.subscriptionId !== subscriptionId) {
      throw new Error("Snapshot belongs to a different subscription");
    }
    if (previous.lastEventId === event.id)
      return { action: "ignored", reason: "duplicate" };
    if (event.created < previous.lastEventCreated) {
      return { action: "ignored", reason: "stale" };
    }
    if (
      TERMINAL_STATUSES.has(previous.status) &&
      !TERMINAL_STATUSES.has(status)
    ) {
      return { action: "ignored", reason: "already-ended" };
    }
  }

  const did = (object.metadata as Record<string, unknown> | undefined)?.did;
  if (!isAtprotoDid(did)) return { action: "rejected", reason: "missing-did" };
  if (previous && previous.did !== did)
    return { action: "rejected", reason: "did-mismatch" };

  return {
    action: "applied",
    snapshot: {
      subscriptionId,
      customerId,
      did,
      status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: object.cancel_at_period_end === true,
      lastEventId: event.id,
      lastEventCreated: event.created,
    },
  };
}

export type Entitlement =
  | { entitled: true; validUntil: Date }
  | { entitled: false };

/**
 * Whether a DID currently has paid access, from its stored snapshots.
 * Access always carries an expiry, so a missed webhook or a cached answer
 * can't extend it past the paid period.
 */
export function evaluateEntitlement(
  did: string,
  snapshots: readonly SubscriptionSnapshot[],
  now: Date = new Date(),
): Entitlement {
  const nowSeconds = now.getTime() / 1000;
  let latest: number | undefined;
  for (const snapshot of snapshots) {
    if (snapshot.did !== did || !ENTITLED_STATUSES.has(snapshot.status))
      continue;
    if (snapshot.currentPeriodEnd <= nowSeconds) continue;
    if (latest === undefined || snapshot.currentPeriodEnd > latest) {
      latest = snapshot.currentPeriodEnd;
    }
  }
  return latest === undefined
    ? { entitled: false }
    : { entitled: true, validUntil: new Date(latest * 1000) };
}
