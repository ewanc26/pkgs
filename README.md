# @ewanc26/svelte-standard-site

> **Canonical source:** This package is now maintained in the [`@ewanc26/pkgs`](https://github.com/ewanc26/pkgs) monorepo under [`packages/svelte-standard-site`](https://github.com/ewanc26/pkgs/tree/main/packages/svelte-standard-site). This copy exists for historical context — please open issues and PRs there.

A SvelteKit library for reading and writing AT Protocol longform content via `site.standard.*` records. Includes a complete design system, publishing tools, federated Bluesky comments, content verification helpers, and pre-built components.

Part of the [`@ewanc26/pkgs`](https://github.com/ewanc26/pkgs) monorepo.

## Installation

```bash
pnpm add @ewanc26/svelte-standard-site zod
```

Requires `svelte >= 5` and `@sveltejs/kit >= 2` as peer dependencies.

## Features

- **Reading** — Fetch `site.standard.document` and `site.standard.publication` records from AT Protocol
- **Writing** — Publish and manage documents via `StandardSitePublisher`
- **Comments** — Federated Bluesky replies as comments via the `<Comments />` component
- **Verification** — `.well-known` endpoint helpers to prove content ownership
- **Design system** — Semantic colour tokens (ink, canvas, primary, secondary, accent) with automatic light/dark mode via Tailwind CSS 4
- **Type-safe** — Full TypeScript with Zod validation
- **SSR-ready** — Works with SvelteKit's `fetch` for prerendering
- **Caching** — In-memory cache with configurable TTL

## Quick Start

### Reading

```typescript
// src/routes/+page.server.ts
import { createClient } from '@ewanc26/svelte-standard-site';

export const load = async ({ fetch }) => {
  const client = createClient({ did: 'did:plc:your-did' });
  const documents = await client.fetchAllDocuments(fetch);
  return { documents };
};
```

### Publishing

```typescript
import { StandardSitePublisher } from '@ewanc26/svelte-standard-site/publisher';

const publisher = new StandardSitePublisher({
  identifier: 'you.bsky.social',
  password: process.env.ATPROTO_APP_PASSWORD
});
await publisher.login();
await publisher.publishDocument({ site, title, content, publishedAt });
```

### Comments

```svelte
<script>
  import { Comments } from '@ewanc26/svelte-standard-site';
</script>

<Comments
  bskyPostUri="at://did:plc:xxx/app.bsky.feed.post/abc"
  canonicalUrl="https://yourblog.com/posts/my-post"
/>
```

## Entry Points

| Import | Description |
|--------|-------------|
| `@ewanc26/svelte-standard-site` | Components, client, stores, types, utilities |
| `@ewanc26/svelte-standard-site/publisher` | `StandardSitePublisher` for writing records |
| `@ewanc26/svelte-standard-site/content` | Markdown transformation utilities |
| `@ewanc26/svelte-standard-site/comments` | Comment fetching utilities |
| `@ewanc26/svelte-standard-site/verification` | `.well-known` and ownership verification |
| `@ewanc26/svelte-standard-site/schemas` | Zod schemas and `COLLECTIONS` constant |
| `@ewanc26/svelte-standard-site/config/env` | `getConfigFromEnv()` SvelteKit helper |
| `@ewanc26/svelte-standard-site/styles/base.css` | Base CSS |
| `@ewanc26/svelte-standard-site/styles/themes.css` | Theme CSS |

## Development

Development happens in the [`@ewanc26/pkgs`](https://github.com/ewanc26/pkgs) monorepo. Local commands (from `packages/svelte-standard-site`):

```bash
pnpm build       # svelte-package → dist/
pnpm dev         # svelte-package --watch
pnpm dev:app     # vite dev (demo routes)
pnpm check       # svelte-check
pnpm test        # vitest run
```

## Environment Variables

```env
PUBLIC_ATPROTO_DID=did:plc:your-did-here
PUBLIC_PUBLICATION_RKEY=3abc123xyz

# For publishing (never commit)
ATPROTO_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
ATPROTO_HANDLE=you.bsky.social
```

## Licence

AGPL-3.0-only — see the [pkgs monorepo licence](https://github.com/ewanc26/pkgs/blob/main/LICENSE).
