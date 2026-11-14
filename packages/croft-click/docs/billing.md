# Paid managed service: design

Status: draft for discussion in [#64](https://github.com/ewanc26/pkgs/issues/64). Nothing here is live.

This covers the identity handshake, how Stripe state turns into access, what is public and what stays private, and the decisions that still need making. The code it describes is in `src/lib/server/billing/` and has tests but is not wired into any route yet.

## Starting point

Every croft.click tool signs in with a public browser OAuth client (`@atproto/oauth-client-browser`, `token_endpoint_auth_method: none`). Tokens stay in the browser and are DPoP-bound to it, so a croft.click server never holds a token it can check. That is why a separate proof step is needed: the server has to learn which DID it is talking to without becoming an OAuth client or a password store.

## Proving control of a DID

1. The user signs in to a tool as they do today. The tool asks for one extra scope, `repo:click.croft.handshake`.
2. The browser asks the croft.click server for a challenge for the signed-in DID. `createChallenge` returns a random 256-bit nonce that expires after ten minutes. The server stores only a SHA-256 hash of it.
3. The browser writes a `click.croft.handshake` record to the user's repository containing the nonce and the service DID.
4. The browser tells the server the record key. The server resolves the DID document itself, takes the PDS from it, and reads `at://<did>/click.croft.handshake/<rkey>` from that PDS. It never uses a PDS, DID or record URI supplied by the client.
5. `verifyHandshake` checks that the record came from the challenged DID's repository, is addressed to this service, and carries the nonce, and that the challenge is unexpired and unused. Storage marks the challenge consumed in the same step, so it works once.
6. The server sets a short-lived session cookie holding the DID. There is no password and no croft.click profile.
7. The browser deletes the handshake record. It was only ever a proof.

Because the identifier is the DID, a handle change has no effect, and a PDS migration only means the next handshake reads from the new PDS. Using another device means doing the handshake again there; no long-lived device cookie is needed to prove a subscription.

Draft lexicon for the handshake record:

```json
{
  "lexicon": 1,
  "id": "click.croft.handshake",
  "defs": {
    "main": {
      "type": "record",
      "description": "Short-lived proof that the repository owner asked to link this DID to a croft.click service. Safe to delete once verified.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["service", "nonce", "createdAt"],
        "properties": {
          "service": { "type": "string", "format": "did" },
          "nonce": { "type": "string", "maxLength": 128 },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

It is not in `lexicons/` yet because nothing writes it. When a tool starts writing it, the lexicon, OAuth scope and tool descriptions should land together, as `AGENTS.md` asks.

## From Stripe to access

1. A user with a verified session asks to subscribe. The server creates a Checkout Session in `subscription` mode for the single price, with `subscription_data.metadata.did` set from the session's DID. If that DID already has a Stripe customer, the session reuses it.
2. Stripe sends `customer.subscription.*` events to the webhook endpoint.
3. `constructStripeEvent` checks the `Stripe-Signature` header against the raw body (HMAC-SHA256, any matching `v1`, five-minute tolerance), the same scheme as `stripe.webhooks.constructEvent`.
4. `applySubscriptionEvent` folds the subscription into a private snapshot keyed by subscription ID. Retries are no-ops, older events are ignored, a cancelled subscription stays cancelled, and a subscription without a valid DID in its metadata, or whose DID changes, is rejected.
5. `evaluateEntitlement` grants access only for `active` or `trialing` subscriptions, and only until the current period ends. Access always carries that expiry, so a missed webhook or a cached answer can't stretch it.
6. Billing details and cancellation go through the Stripe Customer Portal, opened only for a session whose DID owns the customer.

The client never reports payment state. Access is decided only from verified webhooks and the server-held snapshot.

Two Stripe details worth knowing:

- Since API version 2025-03-31 the billing period end is on each subscription item, not the subscription. The code reads the items and falls back to the old field for accounts pinned to an older version.
- Event timestamps are in whole seconds, so two events for the same subscription can share one. To be safe the webhook handler should fetch the current subscription from the API on each event and apply that, rather than trusting delivery order within a second.

Refunds and disputes don't change a subscription's status by themselves. The simplest rule is to cancel the subscription in Stripe whenever a refund or chargeback should end access, so it flows through the same path.

The code checks signatures with `node:crypto` rather than the Stripe SDK, so this PR adds no dependency. Creating Checkout and Portal sessions needs API calls, and at that point the official `stripe` package is probably the better choice; its `constructEvent` can replace `constructStripeEvent`.

## Public and private state

| Data                                 | Where it lives                                         | Public?                  |
| ------------------------------------ | ------------------------------------------------------ | ------------------------ |
| DID                                  | Session cookie, snapshot, Stripe subscription metadata | The DID itself is public |
| Handshake record                     | User's repository, deleted after use                   | Yes, while it exists     |
| Stripe customer and subscription IDs | Snapshot, Stripe                                       | No                       |
| Email, card and address              | Stripe only                                            | No                       |
| Subscription status and period end   | Snapshot                                               | No (see below)           |
| Nonce                                | Hash only, for ten minutes                             | No                       |

A deleted record leaves the repository, but relays and anyone following the firehose will have seen it. The handshake record shows that a DID linked to croft.click, not whether it paid.

The issue's preferred design also has the croft.click service account publish an entitlement record for each paying DID. That would let any tool check access without asking the server, with the service DID as the trust root. The cost is that anyone could list the service repository and see who pays. Payment status is personal data, so publishing it would probably need explicit opt-in. This draft suggests starting with the private snapshot only and adding public records later if a tool needs offline checks. If they are added, a verifier must reject any record not in the service DID's own repository, and every record must expire at the period end so a missed deletion can't outlive the payment.

## Environment variables

None are read yet. The routes will need:

| Variable                | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | API key (`sk_test_...` in development)                   |
| `STRIPE_WEBHOOK_SECRET` | Endpoint signing secret (`whsec_...`)                    |
| `STRIPE_PRICE_ID`       | The one recurring price, created in the Stripe dashboard |
| `CROFT_SERVICE_DID`     | The service DID handshake records must name              |

All of these belong in the hosting provider's secret settings, never in the repository. Test mode uses test keys and the Stripe CLI's `stripe listen` for local webhooks.

## Threats considered

- **Claiming someone else's DID.** Needs a write to their repository, which needs their OAuth session.
- **Replaying a handshake.** Nonces are single-use and expire after ten minutes.
- **Pointing the server at a fake PDS.** The server resolves the PDS from the DID document and doesn't take one from the client. The existing SSRF checks in `toolkit-usage.ts` should be reused for that fetch.
- **Forged or replayed webhooks.** Signature and tolerance checks; idempotent folding.
- **Lost webhooks.** Access still expires at the period end.
- **A Stripe outage.** Existing access is read from the snapshot, so only new purchases and portal visits stop. Tools should keep working on the free tier rather than going down.
- **A PDS or relay outage.** Users can't complete a new handshake, but this never grants access.

## Decisions for Ewan

1. **Charging model.** A single monthly subscription fits the issue's "one understandable paid tier". An annual price could come later.
2. **Public entitlement records or private state only.** See above.
3. **Past-due grace.** The code denies access while a payment is retried. A few days of grace is kinder but means some unpaid access.
4. **Service DID.** `did:web:croft.click` ties identity to the domain. A `did:plc` account can rotate keys and survive a domain move. Either way, document key rotation before launch.
5. **Storage.** Challenges, snapshots and processed event IDs need a small database. Which one depends on the hosting decision.
6. **What the paid tier covers.** Which tools have a free hosted tier, and the limits.
7. **UK requirements.** Consumer terms, privacy notices, and VAT registration and collection need checking against current guidance before live payments. This draft does not cover them.

## What this PR does not do

It adds no routes, UI, storage, Stripe API calls or live configuration, and doesn't change any tool's OAuth scopes. It doesn't settle hosting, pricing or the per-tool statuses.
