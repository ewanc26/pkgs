import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  applySubscriptionEvent,
  constructStripeEvent,
  evaluateEntitlement,
  WebhookSignatureError,
  type StripeEvent,
  type SubscriptionSnapshot,
} from "./stripe";

const SECRET = "whsec_test_not_a_real_secret";
const DID = "did:plc:abcdefghijklmnopqrstuvwx";
const NOW = new Date("2026-11-14T12:00:00Z");
const NOW_S = NOW.getTime() / 1000;
const MONTH = 30 * 24 * 3600;

function sign(payload: string, timestamp = NOW_S, secret = SECRET): string {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function subscriptionEvent(
  overrides: {
    id?: string;
    type?: string;
    created?: number;
    status?: string;
    periodEnd?: number;
    metadata?: Record<string, string>;
  } = {},
): StripeEvent {
  return {
    id: overrides.id ?? "evt_1",
    type: overrides.type ?? "customer.subscription.updated",
    created: overrides.created ?? NOW_S,
    data: {
      object: {
        id: "sub_1",
        object: "subscription",
        customer: "cus_1",
        status: overrides.status ?? "active",
        cancel_at_period_end: false,
        metadata: overrides.metadata ?? { did: DID },
        items: {
          data: [{ current_period_end: overrides.periodEnd ?? NOW_S + MONTH }],
        },
      },
    },
  };
}

function applied(
  previous: SubscriptionSnapshot | undefined,
  event: StripeEvent,
) {
  const result = applySubscriptionEvent(previous, event);
  if (result.action !== "applied")
    throw new Error(`expected applied, got ${result.action}`);
  return result.snapshot;
}

describe("constructStripeEvent", () => {
  const payload = JSON.stringify(subscriptionEvent());

  it("accepts a correctly signed, recent delivery", () => {
    const event = constructStripeEvent({
      payload,
      header: sign(payload),
      secret: SECRET,
      now: NOW,
    });
    expect(event.id).toBe("evt_1");
  });

  it("accepts any matching v1 signature, as during secret rotation", () => {
    const header = `${sign(payload)},v1=${"0".repeat(64)}`;
    expect(() =>
      constructStripeEvent({ payload, header, secret: SECRET, now: NOW }),
    ).not.toThrow();
  });

  it("rejects a body that was changed after signing", () => {
    const header = sign(payload);
    expect(() =>
      constructStripeEvent({
        payload: payload.replace("active", "trialing"),
        header,
        secret: SECRET,
        now: NOW,
      }),
    ).toThrow(WebhookSignatureError);
  });

  it("rejects a signature made with another secret", () => {
    expect(() =>
      constructStripeEvent({
        payload,
        header: sign(payload, NOW_S, "whsec_other"),
        secret: SECRET,
        now: NOW,
      }),
    ).toThrow(WebhookSignatureError);
  });

  it("rejects replays outside the tolerance window", () => {
    const header = sign(payload, NOW_S - 301);
    expect(() =>
      constructStripeEvent({ payload, header, secret: SECRET, now: NOW }),
    ).toThrow(/tolerance/);
  });

  it("rejects missing headers and secrets", () => {
    expect(() =>
      constructStripeEvent({ payload, header: null, secret: SECRET }),
    ).toThrow(WebhookSignatureError);
    expect(() =>
      constructStripeEvent({ payload, header: sign(payload), secret: " " }),
    ).toThrow(WebhookSignatureError);
  });
});

describe("applySubscriptionEvent", () => {
  it("binds the subscription to the DID from its metadata", () => {
    const snapshot = applied(
      undefined,
      subscriptionEvent({ type: "customer.subscription.created" }),
    );
    expect(snapshot).toMatchObject({
      did: DID,
      customerId: "cus_1",
      status: "active",
    });
  });

  it("ignores events that are not about subscriptions", () => {
    const event = { ...subscriptionEvent(), type: "invoice.paid" };
    expect(applySubscriptionEvent(undefined, event)).toEqual({
      action: "ignored",
      reason: "not-a-subscription-event",
    });
  });

  it("is idempotent for retried deliveries", () => {
    const event = subscriptionEvent();
    const snapshot = applied(undefined, event);
    expect(applySubscriptionEvent(snapshot, event)).toEqual({
      action: "ignored",
      reason: "duplicate",
    });
  });

  it("ignores events older than the last one applied", () => {
    const snapshot = applied(
      undefined,
      subscriptionEvent({ id: "evt_2", created: NOW_S + 10 }),
    );
    const older = subscriptionEvent({
      id: "evt_1",
      created: NOW_S,
      status: "past_due",
    });
    expect(applySubscriptionEvent(snapshot, older)).toEqual({
      action: "ignored",
      reason: "stale",
    });
  });

  it("never revives an ended subscription", () => {
    const ended = applied(
      undefined,
      subscriptionEvent({
        id: "evt_2",
        type: "customer.subscription.deleted",
        status: "canceled",
      }),
    );
    const lateActive = subscriptionEvent({ id: "evt_3", status: "active" });
    expect(applySubscriptionEvent(ended, lateActive)).toEqual({
      action: "ignored",
      reason: "already-ended",
    });
  });

  it("refuses subscriptions without a DID, or with a handle instead", () => {
    expect(
      applySubscriptionEvent(undefined, subscriptionEvent({ metadata: {} })),
    ).toEqual({
      action: "rejected",
      reason: "missing-did",
    });
    expect(
      applySubscriptionEvent(
        undefined,
        subscriptionEvent({ metadata: { did: "ewancroft.uk" } }),
      ),
    ).toEqual({ action: "rejected", reason: "missing-did" });
  });

  it("refuses to move a subscription to a different DID", () => {
    const snapshot = applied(undefined, subscriptionEvent());
    const moved = subscriptionEvent({
      id: "evt_2",
      metadata: { did: "did:plc:zyxwvutsrqponmlkjihgfedc" },
    });
    expect(applySubscriptionEvent(snapshot, moved)).toEqual({
      action: "rejected",
      reason: "did-mismatch",
    });
  });

  it("falls back to the subscription-level period end on older API versions", () => {
    const event = subscriptionEvent();
    const object = event.data.object as Record<string, unknown>;
    delete object.items;
    object.current_period_end = NOW_S + 100;
    expect(applied(undefined, event).currentPeriodEnd).toBe(NOW_S + 100);
  });
});

describe("evaluateEntitlement", () => {
  const active = applied(undefined, subscriptionEvent());

  it("grants access until the end of the paid period", () => {
    expect(evaluateEntitlement(DID, [active], NOW)).toEqual({
      entitled: true,
      validUntil: new Date((NOW_S + MONTH) * 1000),
    });
  });

  it("expires on its own if no further webhook arrives", () => {
    const after = new Date((NOW_S + MONTH + 1) * 1000);
    expect(evaluateEntitlement(DID, [active], after)).toEqual({
      entitled: false,
    });
  });

  it("denies access for past-due, unpaid, paused and cancelled subscriptions", () => {
    for (const status of [
      "past_due",
      "unpaid",
      "paused",
      "canceled",
      "incomplete",
    ]) {
      const snapshot = { ...active, status };
      expect(evaluateEntitlement(DID, [snapshot], NOW)).toEqual({
        entitled: false,
      });
    }
  });

  it("keeps access to the period end after the user cancels", () => {
    const cancelling = { ...active, cancelAtPeriodEnd: true };
    expect(evaluateEntitlement(DID, [cancelling], NOW).entitled).toBe(true);
  });

  it("only counts subscriptions bound to the DID being checked", () => {
    expect(
      evaluateEntitlement("did:plc:zyxwvutsrqponmlkjihgfedc", [active], NOW),
    ).toEqual({
      entitled: false,
    });
  });
});
