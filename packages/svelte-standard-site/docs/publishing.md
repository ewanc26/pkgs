# Publishing to ATProto

This guide explains how to publish content FROM your SvelteKit site TO the ATProto network (Bluesky, Leaflet, WhiteWind, etc.).

## Prerequisites

1. A Bluesky account (or any ATProto account)
2. An app password (NOT your main password)
   - Get one at: https://bsky.app/settings/app-passwords
3. Your DID (Decentralized Identifier)
   - Find it at: https://bsky.app/settings

## Quick Start

### 1. Install Dependencies

```bash
pnpm add svelte-standard-site zod
```

### 2. Create a Publication

A publication represents your blog/site on ATProto.

```typescript
// scripts/create-publication.ts
import { StandardSitePublisher } from 'svelte-standard-site/publisher';

const publisher = new StandardSitePublisher({
	identifier: 'you.bsky.social', // or your DID
	password: process.env.ATPROTO_APP_PASSWORD!
});

await publisher.login();

const result = await publisher.publishPublication({
	name: 'My Awesome Blog',
	url: 'https://yourblog.com',
	description: 'Thoughts on code, life, and everything',
	basicTheme: {
		background: { r: 255, g: 245, b: 235 },
		foreground: { r: 30, g: 30, b: 30 },
		accent: { r: 74, g: 124, b: 155 },
		accentForeground: { r: 255, g: 255, b: 255 }
	}
});

console.log('Publication created!');
console.log('AT-URI:', result.uri);
console.log('Save this rkey:', result.uri.split('/').pop());
```

Run it:

```bash
ATPROTO_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" node scripts/create-publication.ts
```

### 3. Publish Documents

Create a script to sync your blog posts to ATProto:

```typescript
// scripts/publish-posts.ts
import { StandardSitePublisher } from 'svelte-standard-site/publisher';
import { transformContent } from 'svelte-standard-site/content';
import fs from 'fs';
import matter from 'gray-matter';

const publisher = new StandardSitePublisher({
	identifier: 'you.bsky.social',
	password: process.env.ATPROTO_APP_PASSWORD!
});

await publisher.login();

// Read your markdown files
const files = fs.readdirSync('./content/posts');

for (const file of files) {
	const content = fs.readFileSync(`./content/posts/${file}`, 'utf-8');
	const { data, content: markdown } = matter(content);

	// Transform content for ATProto
	const transformed = transformContent(markdown, {
		baseUrl: 'https://yourblog.com'
	});

	// Publish to ATProto
	const result = await publisher.publishDocument({
		site: 'https://yourblog.com', // or AT-URI of your publication
		title: data.title,
		description: data.description,
		publishedAt: data.date.toISOString(),
		path: `/posts/${file.replace('.md', '')}`,
		tags: data.tags,
		content: {
			$type: 'site.standard.content.markdown',
			text: transformed.markdown,
			version: '1.0'
		},
		textContent: transformed.textContent
	});

	console.log(`Published: ${data.title}`);
	console.log(`  → ${result.uri}`);
}
```

## Advanced Usage

### Update Existing Documents

```typescript
// Get the rkey from the original publish result
const rkey = '3abc123xyz789';

await publisher.updateDocument(rkey, {
	site: 'https://yourblog.com',
	title: 'Updated Title',
	publishedAt: originalDate.toISOString(),
	updatedAt: new Date().toISOString(),
	content: {
		$type: 'site.standard.content.markdown',
		text: updatedMarkdown
	}
});
```

### Delete Documents

```typescript
await publisher.deleteDocument('3abc123xyz789');
```

### List Your Published Documents

```typescript
const documents = await publisher.listDocuments();

for (const doc of documents) {
	console.log(`${doc.value.title} - ${doc.uri}`);
}
```

### Custom Themes

```typescript
await publisher.publishPublication({
	name: 'Dark Mode Blog',
	url: 'https://yourblog.com',
	basicTheme: {
		background: { r: 13, g: 17, b: 23 }, // Dark
		foreground: { r: 230, g: 237, b: 243 }, // Light text
		accent: { r: 136, g: 58, b: 234 }, // Purple
		accentForeground: { r: 255, g: 255, b: 255 }
	}
});
```

### With Cover Images

First, upload the image as a blob:

```typescript
const agent = publisher.getAtpAgent();

const imageBuffer = fs.readFileSync('./cover.jpg');
const uploadResult = await agent.uploadBlob(imageBuffer, {
	encoding: 'image/jpeg'
});

await publisher.publishDocument({
	// ...other fields
	coverImage: {
		$type: 'blob',
		ref: { $link: uploadResult.data.blob.ref.$link },
		mimeType: 'image/jpeg',
		size: imageBuffer.length
	}
});
```

## SvelteKit Integration

### Create an Admin Route

```typescript
// src/routes/admin/publish/+page.server.ts
import { StandardSitePublisher } from 'svelte-standard-site/publisher';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	// List existing documents
	const publisher = new StandardSitePublisher({
		identifier: env.ATPROTO_HANDLE!,
		password: env.ATPROTO_APP_PASSWORD!
	});

	await publisher.login();
	const documents = await publisher.listDocuments();

	return {
		documents
	};
};

export const actions = {
	publish: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title') as string;
		const content = data.get('content') as string;

		const publisher = new StandardSitePublisher({
			identifier: env.ATPROTO_HANDLE!,
			password: env.ATPROTO_APP_PASSWORD!
		});

		await publisher.login();

		const result = await publisher.publishDocument({
			site: env.PUBLIC_SITE_URL!,
			title,
			publishedAt: new Date().toISOString(),
			content: {
				$type: 'site.standard.content.markdown',
				text: content
			}
		});

		return { success: true, uri: result.uri };
	}
} satisfies Actions;
```

## Important Notes

### Security

1. **Never commit app passwords** - Use environment variables
2. **Never use main password** - Always use app passwords
3. **Validate input** - Always validate data before publishing
4. **Rate limiting** - Be mindful of API rate limits

### TID Format

Record keys (rkeys) MUST be TIDs (Timestamp Identifiers). The publisher generates these automatically. Do not manually create rkeys.

### PDS Resolution

The publisher automatically resolves your PDS from your DID document. You don't need to specify it unless you're using a custom PDS.

### Content Types

The `content` field is an open union. Different platforms support different types:

- `site.standard.content.markdown` - Markdown content
- `site.standard.content.html` - HTML content
- Platform-specific types

Always include `textContent` for search/indexing.

## Troubleshooting

### "Failed to resolve handle"

- Check your handle is correct
- Verify your PDS is reachable
- Ensure you're using an app password

### "Schema validation failed"

- Check your data matches the schema
- Ensure dates are ISO 8601 format
- Verify URLs are valid

### "Invalid TID"

- Don't manually create rkeys
- Let the publisher generate TIDs automatically

### "Authentication failed"

- Verify your app password is correct
- Check it hasn't been revoked
- Ensure you're not using your main password

## Best Practices

1. **Use content transformation** - Always run markdown through `transformContent()`
2. **Include textContent** - Provides plain text for search
3. **Add descriptions** - Helps with discovery
4. **Use tags** - Categorize your content
5. **Set updatedAt** - Track when content changes
6. **Link Bluesky posts** - Use `bskyPostRef` for engagement
7. **Verify ownership** - Set up `.well-known` endpoints

## Next Steps

- [Content Transformation](./content-transformation.md)
- [Verification](./verification.md)
- [Comments](./comments.md)
