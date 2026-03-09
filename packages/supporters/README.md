# @ewanc26/supporters

SvelteKit component library for displaying Ko-fi supporters, backed by an ATProto PDS.

Ko-fi's webhook pushes payment events to your endpoint. Each event is stored as a record under the `uk.ewancroft.kofi.supporter` lexicon on your PDS, with a TID rkey derived from the transaction timestamp. The component reads those records and renders them.

---

## How it works

1. Ko-fi POSTs a webhook event to `/webhook` on each transaction
2. The handler verifies the `verification_token`, respects `is_public`, and calls `appendEvent`
3. `appendEvent` writes a record to your PDS under `uk.ewancroft.kofi.supporter`
4. `readStore` fetches all records and aggregates them into `KofiSupporter` objects
5. Pass the result to `<KofiSupporters>` or `<LunarContributors>`

---

## Setup

### 1. Environment variables

```env
# Required — copy from ko-fi.com/manage/webhooks → Advanced → Verification Token
KOFI_VERIFICATION_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Required — your ATProto identity and a dedicated app password
ATPROTO_DID=did:plc:yourdidhex
ATPROTO_PDS_URL=https://your-pds.example.com
ATPROTO_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Generate an app password at your PDS under **Settings → App Passwords**.

### 2. Register the webhook

Go to **ko-fi.com/manage/webhooks** and set your webhook URL to:

```
https://your-domain.com/webhook
```

### 3. Add the route

Copy `src/routes/webhook/+server.ts` into your SvelteKit app's routes directory.

### 4. Use the component

```ts
// +page.server.ts
import { readStore } from '@ewanc26/supporters';

export const load = async () => ({
  supporters: await readStore()
});
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { KofiSupporters } from '@ewanc26/supporters';
  let { data } = $props();
</script>

<KofiSupporters supporters={data.supporters} />
```

---

## Components

### `<KofiSupporters>`

Displays all supporters with emoji type badges (☕ donation, ⭐ subscription, 🎨 commission, 🛍️ shop order).

| Prop | Type | Default |
|---|---|---|
| `supporters` | `KofiSupporter[]` | `[]` |
| `heading` | `string` | `'Supporters'` |
| `description` | `string` | `'People who support my work on Ko-fi.'` |
| `filter` | `KofiEventType[]` | `undefined` (show all) |
| `loading` | `boolean` | `false` |
| `error` | `string \| null` | `null` |

### `<LunarContributors>`

Convenience wrapper around `<KofiSupporters>` pre-filtered to `Subscription` events.

---

## Importing historical data

Export your transaction history from **ko-fi.com/manage/transactions → Export CSV**, then:

```bash
ATPROTO_DID=... ATPROTO_PDS_URL=... ATPROTO_APP_PASSWORD=... \
  node node_modules/@ewanc26/supporters/scripts/import-history.mjs transactions.csv --dry-run
```

---

## Lexicon

Records are stored under `uk.ewancroft.kofi.supporter` (see `lexicons/`). Each record contains:

```ts
{
  name: string        // display name from Ko-fi
  type: string        // "Donation" | "Subscription" | "Commission" | "Shop Order"
  tier?: string       // subscription tier name, if applicable
}
```

rkeys are TIDs derived from the transaction timestamp via [`@ewanc26/tid`](https://npmjs.com/package/@ewanc26/tid).
