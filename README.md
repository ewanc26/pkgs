# svelte-standard-site

A comprehensive SvelteKit library for ATProto longform publishing. **Read AND write** to the federated web with `site.standard.*` records. Includes a complete design system, publishing tools, federated comments, and pre-built components.

Also on [Tangled](https://tangled.org/did:plc:ofrbh253gwicbkc5nktqepol/svelte-standard-site).

## Features

### Core Functionality
- ✍️ **Publishing** - Publish content TO ATProto (Bluesky, Leaflet, WhiteWind)
- 📖 **Reading** - Fetch and display content FROM ATProto
- 💬 **Comments** - Federated Bluesky comments on your blog
- ✅ **Verification** - Prove content ownership with `.well-known` endpoints
- 🔄 **Content Transformation** - Convert markdown for ATProto compatibility

### UI & Design
- 🎨 **Complete Design System** - Beautiful, accessible color palettes (ink, canvas, primary, secondary, accent)
- 🌓 **Light/Dark Mode** - Built-in theme toggle with system preference detection
- 🧩 **Pre-built Components** - Cards, layouts, document renderers, and UI elements
- 🔧 **Modular Architecture** - Reusable utility components for theming and formatting
- 🌍 **Internationalization** - Automatic locale-aware date formatting
- ♿ **Accessible** - WCAG compliant with proper ARIA labels

### Developer Experience
- 📦 **Type-Safe** - Full TypeScript support with Zod validation
- 🚀 **SSR Ready** - Works seamlessly with SvelteKit
- 💾 **Built-in Caching** - Reduces API calls intelligently
- 🔄 **Automatic PDS Resolution** - Resolves DIDs to PDS endpoints
- 🔗 **AT URI Support** - Parse and convert AT URIs
- 🧪 **Tested** - Includes test suite with Vitest

## Use Cases

| You want to... | Use |
|----------------|-----|
| Show Bluesky replies as comments | `<Comments />` component |
| Publish blog posts to ATProto | `StandardSitePublisher` |
| Pull ATProto posts into your site | `SiteStandardClient` (reader) |
| Verify you own your content | Verification helpers |
| Transform markdown for ATProto | Content utilities |

You can mix and match — use comments without publishing, or publish without reading, etc.

## Installation

```bash
pnpm add svelte-standard-site && # THIS PACKAGE IS NOT YET PUBLISHED TO NPM
pnpm add zod
```

## Quick Start

### Reading from ATProto

Display content from Leaflet, WhiteWind, or other ATProto sources:

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { StandardSiteLayout, DocumentCard } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<StandardSiteLayout title="My Blog">
	{#each data.documents as document}
		<DocumentCard {document} showCover={true} />
	{/each}
</StandardSiteLayout>
```

```typescript
// src/routes/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { getConfigFromEnv } from 'svelte-standard-site/config/env';

export const load = async ({ fetch }) => {
	const config = getConfigFromEnv(); // Reads from env vars
	const client = createClient(config);
	const documents = await client.fetchAllDocuments(fetch);
	
	return { documents };
};
```

### Publishing to ATProto

Write content FROM your blog TO the ATProto network:

```typescript
// scripts/publish-post.ts
import { StandardSitePublisher } from 'svelte-standard-site/publisher';
import { transformContent } from 'svelte-standard-site/content';

const publisher = new StandardSitePublisher({
	identifier: 'you.bsky.social',
	password: process.env.ATPROTO_APP_PASSWORD! // App password, not main password
});

await publisher.login();

// Transform your markdown
const transformed = transformContent(markdownContent, {
	baseUrl: 'https://yourblog.com'
});

// Publish to ATProto
const result = await publisher.publishDocument({
	site: 'https://yourblog.com',
	title: 'My Blog Post',
	publishedAt: new Date().toISOString(),
	content: {
		$type: 'site.standard.content.markdown',
		text: transformed.markdown,
		version: '1.0'
	},
	textContent: transformed.textContent,
	tags: ['blog', 'tutorial']
});

console.log('Published:', result.uri);
```

### Federated Comments

Display Bluesky replies as comments:

```svelte
<script lang="ts">
	import { Comments } from 'svelte-standard-site';
</script>

<article>
	<h1>{post.title}</h1>
	{@html post.content}
</article>

{#if post.bskyPostUri}
	<Comments 
		bskyPostUri={post.bskyPostUri}
		canonicalUrl="https://yourblog.com/posts/{post.slug}"
		maxDepth={3}
	/>
{/if}
```

### Content Verification

Prove you own your content:

```typescript
// src/routes/.well-known/site.standard.publication/+server.ts
import { text } from '@sveltejs/kit';
import { generatePublicationWellKnown } from 'svelte-standard-site/verification';

export function GET() {
	return text(
		generatePublicationWellKnown({
			did: 'did:plc:your-did',
			publicationRkey: '3abc123xyz'
		})
	);
}
```

## Documentation

### Core Guides
- **[Publishing Guide](./docs/publishing.md)** - Publish content TO ATProto
- **[Content Transformation](./docs/content-transformation.md)** - Transform markdown for ATProto
- **[Verification](./docs/verification.md)** - Prove content ownership
- **[Comments](./docs/comments.md)** - Federated Bluesky comments

### Complete Examples
- **[EXAMPLES.md](./EXAMPLES.md)** - Comprehensive usage examples
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant context and architecture
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines

## Components

### Core Components

#### StandardSiteLayout
Complete page layout with header, footer, and theme management.

```svelte
<StandardSiteLayout title="My Site" showThemeToggle={true}>
	<slot />
</StandardSiteLayout>
```

#### DocumentCard
Displays a `site.standard.document` with title, description, cover, tags, and dates.

```svelte
<DocumentCard {document} showCover={true} />
```

#### PublicationCard
Displays a `site.standard.publication` with icon, name, and description.

```svelte
<PublicationCard {publication} />
```

#### Comments
Federated Bluesky comments on your blog posts.

```svelte
<Comments 
	bskyPostUri="at://did:plc:xxx/app.bsky.feed.post/abc123"
	canonicalUrl="https://yourblog.com/posts/my-post"
/>
```

### Utility Components

- **DateDisplay** - Locale-aware date formatting
- **TagList** - Theme-aware tag display
- **ThemedContainer** - Wrap content with theme CSS variables
- **ThemedText** - Text with theme-aware colors
- **ThemedCard** - Base card with theme support
- **ThemeToggle** - Dark/light mode toggle button

See [EXAMPLES.md](./EXAMPLES.md) for detailed usage.

## API Reference

### Reading (SiteStandardClient)

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({
	did: 'did:plc:xxx',
	pds: 'https://...',  // optional
	cacheTTL: 300000     // optional
});

// Fetch methods
await client.fetchPublication(rkey, fetch);
await client.fetchAllPublications(fetch);
await client.fetchDocument(rkey, fetch);
await client.fetchAllDocuments(fetch);
await client.fetchDocumentsByPublication(pubUri, fetch);
await client.fetchByAtUri(atUri, fetch);

// Utilities
client.clearCache();
await client.getPDS(fetch);
```

### Writing (StandardSitePublisher)

```typescript
import { StandardSitePublisher } from 'svelte-standard-site/publisher';

const publisher = new StandardSitePublisher({
	identifier: 'you.bsky.social',
	password: 'xxxx-xxxx-xxxx-xxxx'
});

await publisher.login();

// Publish operations
await publisher.publishPublication({ name, url, ... });
await publisher.publishDocument({ site, title, ... });
await publisher.updateDocument(rkey, { ... });
await publisher.deleteDocument(rkey);

// List operations
await publisher.listPublications();
await publisher.listDocuments();

// Utilities
publisher.getDid();
publisher.getPdsUrl();
publisher.getAtpAgent();
```

### Content Transformation

```typescript
import { transformContent } from 'svelte-standard-site/content';

const result = transformContent(markdown, {
	baseUrl: 'https://yourblog.com'
});

// result.markdown      - Cleaned markdown for ATProto
// result.textContent   - Plain text for search
// result.wordCount     - Number of words
// result.readingTime   - Estimated minutes
```

Individual functions:
- `convertSidenotes(markdown)` - HTML sidenotes → markdown blockquotes
- `resolveRelativeLinks(markdown, baseUrl)` - Relative → absolute URLs
- `stripToPlainText(markdown)` - Extract plain text
- `countWords(text)` - Count words
- `calculateReadingTime(wordCount)` - Estimate reading time

### Comments

```typescript
import { fetchComments } from 'svelte-standard-site/comments';

const comments = await fetchComments({
	bskyPostUri: 'at://...',
	canonicalUrl: 'https://...',
	maxDepth: 3
});
```

### Verification

```typescript
import { 
	generatePublicationWellKnown,
	generateDocumentLinkTag,
	getDocumentAtUri,
	verifyPublicationWellKnown
} from 'svelte-standard-site/verification';

// For .well-known endpoint
generatePublicationWellKnown({ did, publicationRkey });

// For <head> tag
generateDocumentLinkTag({ did, documentRkey });

// Build AT-URIs
getDocumentAtUri(did, rkey);

// Verify ownership
await verifyPublicationWellKnown(siteUrl, did, rkey);
```

## Design System

The library uses semantic color tokens that automatically adapt to light/dark mode:

- **Ink** - Text colors (`ink-50` to `ink-950`)
- **Canvas** - Background colors (`canvas-50` to `canvas-950`)
- **Primary** - Primary brand colors (`primary-50` to `primary-950`)
- **Secondary** - Secondary brand colors (`secondary-50` to `secondary-950`)
- **Accent** - Accent colors (`accent-50` to `accent-950`)

All colors work with Tailwind v4's `light-dark()` function and automatically switch in dark mode.

```svelte
<div class="bg-canvas-50 text-ink-900 dark:bg-canvas-950 dark:text-ink-50">
	<h1 class="text-primary-600 dark:text-primary-400">Hello World</h1>
</div>
```

## Environment Variables

```env
# Required for reading
PUBLIC_ATPROTO_DID=did:plc:your-did-here

# Optional
PUBLIC_ATPROTO_PDS=https://your-pds.example.com
PUBLIC_CACHE_TTL=300000

# Required for publishing (use .env.local, never commit)
ATPROTO_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
ATPROTO_HANDLE=you.bsky.social

# Required for verification
PUBLIC_PUBLICATION_RKEY=3abc123xyz
```

## Testing

Run the test publisher script:

```bash
ATPROTO_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" node scripts/test-publisher.js
```

Run unit tests:

```bash
pnpm test
```

## Important Notes

### Security
- **Never commit app passwords** - Use environment variables
- **Never use main password** - Always create app passwords at https://bsky.app/settings/app-passwords
- **Validate input** - Always validate data before publishing

### TID Format
Record keys (rkeys) MUST be TIDs (Timestamp Identifiers). The publisher generates these automatically. Do not manually create rkeys.

### PDS Resolution
The publisher automatically resolves your PDS from your DID document. You don't need to specify it unless using a custom PDS.

### Caching
The client caches responses for 5 minutes by default. Clear with `client.clearCache()` or adjust TTL in config.

### SSR
All fetch operations support SvelteKit's `fetch` function for proper SSR and prerendering.

## Workflows

### Complete Publishing Workflow

1. **Create a publication** (once)
2. **Write a blog post** in markdown
3. **Transform content** for ATProto compatibility
4. **Publish to ATProto** using the publisher
5. **Share on Bluesky** to create an announcement post
6. **Add AT-URI to post** for federated comments
7. **Set up verification** with `.well-known` endpoint

See [docs/publishing.md](./docs/publishing.md) for detailed steps.

### Adding Comments to Existing Posts

1. **Share post on Bluesky** (creates announcement post)
2. **Get AT-URI** from the Bluesky post
3. **Add to frontmatter** or database
4. **Add Comments component** to post template
5. **Comments load automatically** when users visit

See [docs/comments.md](./docs/comments.md) for detailed steps.

## Troubleshooting

### "Failed to resolve handle"
- Verify handle is correct
- Check PDS is reachable
- Ensure using app password

### "Schema validation failed"
- Check data matches schema
- Ensure dates are ISO 8601
- Verify URLs are valid

### Comments not loading
- Verify AT-URI format is correct
- Check post exists and is public
- Look for errors in console

### Verification 404
- Ensure `.well-known` path is correct
- Check hosting platform allows `.well-known`
- Verify endpoint returns plain text

See documentation for more troubleshooting tips.

## Browser Support

- Modern browsers with CSS `light-dark()` support
- Tailwind CSS v4+ required
- Svelte 5+ required
- SvelteKit 2+ required

## License

[AGPL-3.0](./LICENSE)

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Credits

- Built by [Ewan Croft](https://ewancroft.uk)
- Powered by [AT Protocol](https://atproto.com)
- Icons from [Lucide](https://lucide.dev)
- Typography by [Inter](https://rsms.me/inter/)

## Links

- [GitHub Repository](https://github.com/ewanc26/svelte-standard-site)
- [NPM Package](https://www.npmjs.com/package/svelte-standard-site)
- [Documentation](./docs/)
- [Examples](./EXAMPLES.md)
- [AT Protocol](https://atproto.com)
- [standard.site Specification](https://github.com/noeleon/site.standard)
- [Bluesky](https://bsky.app)
- [Leaflet](https://leaflet.pub)
- [WhiteWind](https://whitewind.pages.dev)
