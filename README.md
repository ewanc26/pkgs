# svelte-standard-site

A SvelteKit library for fetching and working with `site.standard.*` records from the AT Protocol.

## Features

- 🔄 **Automatic PDS Resolution** - Resolves DIDs to their Personal Data Server endpoints
- 📦 **Type-Safe** - Full TypeScript support with complete type definitions
- 🚀 **SSR Ready** - Works seamlessly with SvelteKit's server-side rendering
- 💾 **Built-in Caching** - Reduces API calls with intelligent caching
- 🎯 **Simple API** - Easy to use, set it and forget it configuration
- 🔗 **AT URI Support** - Parse and convert AT URIs to HTTPS URLs

## Installation

```bash
pnpm add svelte-standard-site
# or
npm install svelte-standard-site
# or
yarn add svelte-standard-site
```

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in your project root:

```env
PUBLIC_ATPROTO_DID=did:plc:your-did-here
# Optional: specify a custom PDS endpoint
PUBLIC_ATPROTO_PDS=https://your-pds.example.com
# Optional: cache TTL in milliseconds (default: 300000 = 5 minutes)
PUBLIC_CACHE_TTL=300000
```

### 2. Create a Client

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({
	did: 'did:plc:revjuqmkvrw6fnkxppqtszpv'
});

// Fetch a single publication
const publication = await client.fetchPublication('3lwafzkjqm25s');

// Fetch all publications
const publications = await client.fetchAllPublications();

// Fetch all documents
const documents = await client.fetchAllDocuments();

// Fetch documents for a specific publication
const pubDocs = await client.fetchDocumentsByPublication(
	'at://did:plc:revjuqmkvrw6fnkxppqtszpv/site.standard.publication/3lwafzkjqm25s'
);
```

### 3. Use in SvelteKit Load Functions

```typescript
// src/routes/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { getConfigFromEnv } from 'svelte-standard-site/config/env';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const config = getConfigFromEnv();
	if (!config) {
		throw new Error('Missing configuration');
	}

	const client = createClient(config);

	const [publications, documents] = await Promise.all([
		client.fetchAllPublications(fetch),
		client.fetchAllDocuments(fetch)
	]);

	return {
		publications,
		documents
	};
};
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<h1>Publications</h1>
{#each data.publications as pub}
	<article>
		<h2>{pub.value.name}</h2>
		<p>{pub.value.description}</p>
		<a href={pub.value.url}>Visit</a>
	</article>
{/each}

<h1>Documents</h1>
{#each data.documents as doc}
	<article>
		<h2>{doc.value.title}</h2>
		<p>{doc.value.description}</p>
		<time>{new Date(doc.value.publishedAt).toLocaleDateString()}</time>
	</article>
{/each}
```

## API Reference

### `SiteStandardClient`

The main client for interacting with site.standard records.

#### Constructor

```typescript
new SiteStandardClient(config: SiteStandardConfig)
```

#### Methods

- `fetchPublication(rkey: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<Publication> | null>`
  - Fetch a single publication by record key

- `fetchAllPublications(fetchFn?: typeof fetch): Promise<AtProtoRecord<Publication>[]>`
  - Fetch all publications for the configured DID

- `fetchDocument(rkey: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<Document> | null>`
  - Fetch a single document by record key

- `fetchAllDocuments(fetchFn?: typeof fetch): Promise<AtProtoRecord<Document>[]>`
  - Fetch all documents for the configured DID, sorted by publishedAt (newest first)

- `fetchDocumentsByPublication(publicationUri: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<Document>[]>`
  - Fetch all documents belonging to a specific publication

- `fetchByAtUri<T>(atUri: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<T> | null>`
  - Fetch any record by its AT URI

- `clearCache(): void`
  - Clear all cached data

- `getPDS(fetchFn?: typeof fetch): Promise<string>`
  - Get the resolved PDS endpoint

### Types

```typescript
interface Publication {
	$type: 'site.standard.publication';
	url: string;
	name: string;
	icon?: AtProtoBlob;
	description?: string;
	basicTheme?: BasicTheme;
	preferences?: PublicationPreferences;
}

interface Document {
	$type: 'site.standard.document';
	site: string; // AT URI or HTTPS URL
	title: string;
	path?: string;
	description?: string;
	coverImage?: AtProtoBlob;
	content?: any;
	textContent?: string;
	bskyPostRef?: StrongRef;
	tags?: string[];
	publishedAt: string;
	updatedAt?: string;
}

interface AtProtoRecord<T> {
	uri: string;
	cid: string;
	value: T;
}
```

### Utility Functions

#### AT URI Utilities

```typescript
import { parseAtUri, atUriToHttps, buildAtUri, isAtUri } from 'svelte-standard-site';

// Parse an AT URI
const parsed = parseAtUri('at://did:plc:xxx/site.standard.publication/rkey');
// Returns: { did: 'did:plc:xxx', collection: 'site.standard.publication', rkey: 'rkey' }

// Convert AT URI to HTTPS URL
const url = atUriToHttps(
	'at://did:plc:xxx/site.standard.publication/rkey',
	'https://pds.example.com'
);
// Returns: 'https://pds.example.com/xrpc/com.atproto.repo.getRecord?repo=...'

// Build an AT URI
const uri = buildAtUri('did:plc:xxx', 'site.standard.publication', 'rkey');
// Returns: 'at://did:plc:xxx/site.standard.publication/rkey'

// Validate AT URI
const valid = isAtUri('at://did:plc:xxx/site.standard.publication/rkey');
// Returns: true
```

#### PDS Resolution

```typescript
import { resolveIdentity, buildPdsBlobUrl } from 'svelte-standard-site';

// Resolve a DID to its PDS
const identity = await resolveIdentity('did:plc:xxx');
// Returns: { did: 'did:plc:xxx', pds: 'https://...', handle?: 'user.bsky.social' }

// Build a blob URL
const blobUrl = buildPdsBlobUrl('https://pds.example.com', 'did:plc:xxx', 'bafyrei...');
// Returns: 'https://pds.example.com/xrpc/com.atproto.sync.getBlob?did=...&cid=...'
```

## Configuration

### From Environment Variables

```typescript
import { getConfigFromEnv, validateEnv } from 'svelte-standard-site/config/env';

// Get config (returns null if missing)
const config = getConfigFromEnv();

// Validate config (throws if missing)
validateEnv();
```

### Manual Configuration

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({
	did: 'did:plc:revjuqmkvrw6fnkxppqtszpv',
	pds: 'https://cortinarius.us-west.host.bsky.network', // optional
	cacheTTL: 300000 // optional, in milliseconds
});
```

## Caching

The library includes built-in caching to reduce API calls:

- Default TTL: 5 minutes (300,000ms)
- Configurable via `cacheTTL` option or `PUBLIC_CACHE_TTL` env var
- Cache can be cleared manually with `client.clearCache()`

## AT URI Structure

AT URIs follow this format:

```
at://did:plc:revjuqmkvrw6fnkxppqtszpv/site.standard.publication/3lwafzkjqm25s
     └─────────┬─────────┘ └──────────┬──────────┘ └────┬────┘
              DID              Collection           Record Key
```

The library automatically converts these to HTTPS URLs for API calls:

```
https://cortinarius.us-west.host.bsky.network/xrpc/com.atproto.repo.getRecord?repo=did:plc:revjuqmkvrw6fnkxppqtszpv&collection=site.standard.publication&rkey=3lwafzkjqm25s
```

## Example: Building a Blog

```typescript
// src/routes/blog/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';

export const load = async ({ fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });
	const documents = await client.fetchAllDocuments(fetch);

	return {
		posts: documents.map((doc) => ({
			title: doc.value.title,
			description: doc.value.description,
			publishedAt: doc.value.publishedAt,
			slug: doc.uri.split('/').pop(),
			tags: doc.value.tags || []
		}))
	};
};
```

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';
import { error } from '@sveltejs/kit';

export const load = async ({ params, fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });
	const document = await client.fetchDocument(params.slug, fetch);

	if (!document) {
		throw error(404, 'Post not found');
	}

	return {
		post: document.value
	};
};
```

## License

[AGPL-3.0](./LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
