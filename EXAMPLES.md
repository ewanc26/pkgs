# Usage Examples

This document provides comprehensive examples of using the svelte-standard-site library.

## Basic Setup

### 1. Install the Package

```bash
pnpm add svelte-standard-site
```

### 2. Configure Environment Variables

Create a `.env` file:

```env
PUBLIC_ATPROTO_DID=did:plc:revjuqmkvrw6fnkxppqtszpv
```

## Example 1: Simple Blog List

Fetch and display all documents as blog posts.

```typescript
// src/routes/blog/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });
	const documents = await client.fetchAllDocuments(fetch);

	return {
		posts: documents
	};
};
```

```svelte
<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
	import { DocumentCard } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<div class="container">
	<h1>Blog Posts</h1>
	<div class="posts">
		{#each data.posts as post}
			<DocumentCard document={post} />
		{/each}
	</div>
</div>
```

## Example 2: Single Post Page

Display a single document by its record key (slug).

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });
	const document = await client.fetchDocument(params.slug, fetch);

	if (!document) {
		throw error(404, 'Post not found');
	}

	return {
		post: document
	};
};
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const post = data.post.value;
</script>

<article>
	{#if post.coverImage}
		<img src={post.coverImage.ref.$link} alt={post.title} />
	{/if}

	<h1>{post.title}</h1>

	<div class="meta">
		<time>{new Date(post.publishedAt).toLocaleDateString()}</time>
		{#if post.tags}
			<div class="tags">
				{#each post.tags as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if post.description}
		<p class="description">{post.description}</p>
	{/if}

	{#if post.textContent}
		<div class="content">
			{post.textContent}
		</div>
	{/if}
</article>
```

## Example 3: Publication-Filtered Posts

Display documents from a specific publication.

```typescript
// src/routes/publications/[pubkey]/+page.server.ts
import { createClient, buildAtUri } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });

	// Fetch the publication
	const publication = await client.fetchPublication(params.pubkey, fetch);
	if (!publication) {
		throw error(404, 'Publication not found');
	}

	// Fetch documents for this publication
	const publicationUri = buildAtUri(PUBLIC_ATPROTO_DID, 'site.standard.publication', params.pubkey);
	const documents = await client.fetchDocumentsByPublication(publicationUri, fetch);

	return {
		publication,
		documents
	};
};
```

```svelte
<!-- src/routes/publications/[pubkey]/+page.svelte -->
<script lang="ts">
	import { PublicationCard, DocumentCard } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<div class="publication-page">
	<PublicationCard publication={data.publication} />

	<h2>Posts in this Publication</h2>
	<div class="documents">
		{#each data.documents as doc}
			<DocumentCard document={doc} />
		{/each}
	</div>
</div>
```

## Example 4: Using AT URIs

Fetch a record using its full AT URI.

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({ did: 'did:plc:revjuqmkvrw6fnkxppqtszpv' });

// Fetch using AT URI
const publication = await client.fetchByAtUri(
	'at://did:plc:revjuqmkvrw6fnkxppqtszpv/site.standard.publication/3lwafzkjqm25s'
);

console.log(publication?.value.name);
```

## Example 5: Manual Configuration

Configure the client without environment variables.

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({
	did: 'did:plc:revjuqmkvrw6fnkxppqtszpv',
	pds: 'https://cortinarius.us-west.host.bsky.network',
	cacheTTL: 600000 // 10 minutes
});
```

## Example 6: Custom Publication Listing

Create a custom component to display publications.

```svelte
<script lang="ts">
	import type { AtProtoRecord, Publication } from 'svelte-standard-site';

	interface Props {
		publications: AtProtoRecord<Publication>[];
	}

	const { publications }: Props = $props();
</script>

<div class="publications-grid">
	{#each publications as pub}
		<a href="/pub/{pub.uri.split('/').pop()}" class="pub-card">
			{#if pub.value.icon}
				<img src={pub.value.icon.ref.$link} alt={pub.value.name} />
			{/if}
			<h3>{pub.value.name}</h3>
			<p>{pub.value.description}</p>
		</a>
	{/each}
</div>

<style>
	.publications-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.pub-card {
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s;
	}

	.pub-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.pub-card img {
		width: 100%;
		height: 150px;
		object-fit: cover;
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}

	.pub-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.pub-card p {
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
```

## Example 7: Search and Filter

Implement search and tag filtering.

```typescript
// src/routes/search/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });
	const documents = await client.fetchAllDocuments(fetch);

	const query = url.searchParams.get('q')?.toLowerCase() || '';
	const tag = url.searchParams.get('tag') || '';

	const filtered = documents.filter((doc) => {
		const matchesQuery =
			!query ||
			doc.value.title.toLowerCase().includes(query) ||
			doc.value.description?.toLowerCase().includes(query) ||
			doc.value.textContent?.toLowerCase().includes(query);

		const matchesTag = !tag || doc.value.tags?.includes(tag);

		return matchesQuery && matchesTag;
	});

	// Get all unique tags
	const allTags = new Set<string>();
	documents.forEach((doc) => {
		doc.value.tags?.forEach((t) => allTags.add(t));
	});

	return {
		documents: filtered,
		tags: Array.from(allTags).sort(),
		query,
		selectedTag: tag
	};
};
```

## Example 8: RSS Feed

Generate an RSS feed from documents.

```typescript
// src/routes/rss.xml/+server.ts
import { createClient } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });
	const documents = await client.fetchAllDocuments(fetch);

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <link>https://example.com</link>
    <description>Blog posts from AT Protocol</description>
    ${documents
			.map(
				(doc) => `
    <item>
      <title>${escapeXml(doc.value.title)}</title>
      <description>${escapeXml(doc.value.description || '')}</description>
      <pubDate>${new Date(doc.value.publishedAt).toUTCString()}</pubDate>
      <guid>${doc.uri}</guid>
    </item>`
			)
			.join('')}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/xml'
		}
	});
};

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
```

## Example 9: Sitemap Generation

Generate a sitemap from documents.

```typescript
// src/routes/sitemap.xml/+server.ts
import { createClient } from 'svelte-standard-site';
import { PUBLIC_ATPROTO_DID } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const client = createClient({ did: PUBLIC_ATPROTO_DID });
	const documents = await client.fetchAllDocuments(fetch);

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${documents
		.map((doc) => {
			const slug = doc.uri.split('/').pop();
			return `
  <url>
    <loc>https://example.com/blog/${slug}</loc>
    <lastmod>${new Date(doc.value.updatedAt || doc.value.publishedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
		})
		.join('')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml'
		}
	});
};
```

## Example 10: Client-Side Usage

Use the client in browser context (not recommended for production due to CORS, but useful for prototyping).

```svelte
<script lang="ts">
	import { createClient } from 'svelte-standard-site';
	import { onMount } from 'svelte';

	let documents = $state([]);
	let loading = $state(true);

	onMount(async () => {
		const client = createClient({ did: 'did:plc:revjuqmkvrw6fnkxppqtszpv' });
		documents = await client.fetchAllDocuments();
		loading = false;
	});
</script>

{#if loading}
	<p>Loading...</p>
{:else}
	{#each documents as doc}
		<div>{doc.value.title}</div>
	{/each}
{/if}
```

## Best Practices

1. **Always use SSR**: Fetch data in `+page.server.ts` or `+layout.server.ts` for better performance and SEO
2. **Pass fetch function**: Always pass SvelteKit's `fetch` to client methods for proper SSR hydration
3. **Handle errors**: Wrap client calls in try-catch and provide user-friendly error messages
4. **Use caching**: The built-in cache reduces API calls, but you can adjust TTL as needed
5. **Type safety**: Import and use TypeScript types for better developer experience
