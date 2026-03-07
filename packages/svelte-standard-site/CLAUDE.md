# CLAUDE.md

## What

SvelteKit library for ATProto longform publishing via the `standard.site` lexicon. Provides both read and write capabilities: display content from ATProto (Leaflet/WhiteWind), publish content TO ATProto, and aggregate federated comments.

**Package:** `svelte-standard-site`

## Project Structure

```
src/lib/
  client.ts          # Read from ATProto (fetch documents/publications)
  publisher.ts       # Write to ATProto (publish documents/publications)
  schemas.ts         # Zod schemas for validation
  types.ts           # TypeScript type definitions
  components/
    Comments.svelte  # Federated comments from Bluesky
    DocumentCard.svelte
    PublicationCard.svelte
    StandardSiteLayout.svelte
    ThemeToggle.svelte
    common/          # Reusable utility components
    document/        # Document rendering components
  utils/
    content.ts       # Markdown transformation (sidenotes, links, etc.)
    comments.ts      # Fetch Bluesky replies
    verification.ts  # Ownership verification helpers
    at-uri.ts        # AT-URI parsing and conversion
    theme.ts         # Theme utilities
    cache.ts         # Caching layer
  stores/
    theme.ts         # Dark/light mode store
  styles/
    base.css         # Core design system
    themes.css       # Theme definitions
```

## Commands

```bash
pnpm dev         # Start dev server
pnpm build       # Build package
pnpm test        # Run tests
pnpm check       # Type check
```

## Critical: TID Format

Record keys for `site.standard.document` and `site.standard.publication` MUST be TIDs. Schema validation will reject anything else.

**TID requirements:**
- 13 characters, base32-sortable charset: `234567abcdefghijklmnopqrstuvwxyz`
- First char must be `234567abcdefghij` (top bit = 0)
- Regex: `/^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/`

See `generateTid()` in `src/lib/publisher.ts` — do not modify without reading https://atproto.com/specs/tid

## Critical: ES Modules

`package.json` must have `"type": "module"`. Without this, imports break.

## Key Concepts

### Read vs Write

- **SiteStandardClient** (`client.ts`): Read-only. Fetches content from ATProto.
- **StandardSitePublisher** (`publisher.ts`): Write operations. Publishes content to ATProto.

### Content Transformation

The `content.ts` utilities transform markdown for ATProto compatibility:
- Convert HTML sidenotes → markdown blockquotes
- Resolve relative links → absolute URLs
- Extract plain text for search indexing
- Calculate word count and reading time

### Comments System

The Comments component fetches Bluesky replies and displays them as comments on blog posts. It uses the ATProto API to recursively fetch threaded conversations.

### Verification

Verification helpers generate `.well-known` endpoints and `<link>` tags to prove content ownership. This allows platforms to verify that you control the content you've published.

## Testing Against Real PDS

```bash
# Set your app password
export ATPROTO_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"

# Run publisher test
node scripts/test-publisher.js
```

For integration testing, use `pds.rip` (throwaway test accounts).

## Design System

The library uses semantic color tokens that automatically adapt to light/dark mode:

- **Ink**: Text colors (ink-50 to ink-950)
- **Canvas**: Background colors (canvas-50 to canvas-950)
- **Primary**: Brand colors (primary-50 to primary-950)
- **Secondary**: Secondary brand (secondary-50 to secondary-950)
- **Accent**: Accent colors (accent-50 to accent-950)

All styled using Tailwind v4 with `light-dark()` function.

## Publishing to ATProto

```typescript
import { StandardSitePublisher } from 'svelte-standard-site/publisher';

const publisher = new StandardSitePublisher({
  identifier: 'you.bsky.social',
  password: process.env.ATPROTO_APP_PASSWORD!,
});

await publisher.login();

await publisher.publishDocument({
  site: 'https://yourblog.com',
  title: 'My Post',
  publishedAt: new Date().toISOString(),
  content: {
    $type: 'site.standard.content.markdown',
    text: markdownContent,
    version: '1.0',
  },
  textContent: plainTextContent,
});
```

## Reading from ATProto

```typescript
import { createClient } from 'svelte-standard-site';
import { getConfigFromEnv } from 'svelte-standard-site/config/env';

const config = getConfigFromEnv();
const client = createClient(config);

const documents = await client.fetchAllDocuments(fetch);
const publications = await client.fetchAllPublications(fetch);
```

## Comments

```svelte
<script>
  import { Comments } from 'svelte-standard-site';
</script>

<Comments
  bskyPostUri="at://did:plc:xxx/app.bsky.feed.post/abc123"
  canonicalUrl="https://yourblog.com/posts/my-post"
  maxDepth={3}
/>
```

## Content Transformation

```typescript
import { transformContent } from 'svelte-standard-site/content';

const result = transformContent(rawMarkdown, {
  baseUrl: 'https://yourblog.com',
});

// result.markdown - cleaned for ATProto
// result.textContent - plain text for search
// result.wordCount
// result.readingTime
```

## Verification

```typescript
// src/routes/.well-known/site.standard.publication/+server.ts
import { generatePublicationWellKnown } from 'svelte-standard-site/verification';
import { text } from '@sveltejs/kit';

export function GET() {
  return text(
    generatePublicationWellKnown({
      did: 'did:plc:xxx',
      publicationRkey: '3abc123xyz',
    })
  );
}
```

## Important Notes

1. **App Passwords**: Always use app passwords, never main account passwords
2. **PDS Resolution**: The publisher auto-resolves PDS from DID documents
3. **Caching**: The client has built-in caching (5-minute TTL by default)
4. **SSR**: All fetch operations support SvelteKit's `fetch` for SSR
5. **Theme Store**: Call `themeStore.init()` in `onMount()` to enable theme toggle
6. **Blob URLs**: Cover images and icons are converted from blob refs to HTTPS URLs

## External References

- ATProto specs: https://atproto.com/
- standard.site: https://standard.site/
- Lexicon explorer: https://pdsls.dev/
- Bluesky: https://bsky.app/

## License

AGPL-3.0 (stricter than Astro version's MIT)
