# Federated Comments

Display Bluesky replies as comments on your blog posts using the Comments component.

## How It Works

1. You publish a blog post
2. You share it on Bluesky (creating an "announcement post")
3. People reply to that Bluesky post
4. The Comments component fetches those replies and displays them as comments

## Quick Start

### 1. Install

```bash
pnpm add svelte-standard-site
```

### 2. Add to Your Blog Post

```svelte
<script lang="ts">
	import { Comments } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<article>
	<h1>{data.post.title}</h1>
	{@html data.post.content}
</article>

{#if data.post.bskyPostUri}
	<Comments
		bskyPostUri={data.post.bskyPostUri}
		canonicalUrl="https://yourblog.com/posts/{data.post.slug}"
	/>
{/if}
```

### 3. Get the AT-URI

When you share your post on Bluesky:

1. Click on your post
2. Click the "..." menu
3. Click "Copy post link"
4. Convert to AT-URI format

```
URL:    https://bsky.app/profile/you.bsky.social/post/abc123xyz
AT-URI: at://did:plc:YOUR_DID/app.bsky.feed.post/abc123xyz
```

### 4. Store the AT-URI

Add it to your post's frontmatter or database:

```yaml
---
title: My Blog Post
date: 2026-01-25
bskyPostUri: at://did:plc:xxx/app.bsky.feed.post/abc123xyz
---
```

## Component Props

```svelte
<Comments
  bskyPostUri="at://..."           // Required: AT-URI of announcement post
  canonicalUrl="https://..."       // Required: URL of your blog post
  maxDepth={3}                     // Optional: Max reply nesting (default: 3)
  title="Comments"                 // Optional: Section heading
  showReplyLink={true}             // Optional: Show "Reply on Bluesky" link
  class="my-custom-class"          // Optional: Additional CSS classes
/>
```

## Workflow

### Complete Example

1. **Write and publish your blog post**

```typescript
// scripts/publish-post.ts
import { StandardSitePublisher } from 'svelte-standard-site/publisher';

const publisher = new StandardSitePublisher({
	identifier: 'you.bsky.social',
	password: process.env.ATPROTO_APP_PASSWORD!
});

await publisher.login();

const result = await publisher.publishDocument({
	site: 'https://yourblog.com',
	title: 'Understanding ATProto',
	publishedAt: new Date().toISOString(),
	path: '/posts/understanding-atproto'
	// ...
});
```

2. **Share on Bluesky**

```typescript
// Create announcement post
const agent = publisher.getAtpAgent();

const postResult = await agent.post({
	text: `New blog post: Understanding ATProto

Read it at: https://yourblog.com/posts/understanding-atproto`,
	langs: ['en']
});

console.log('Post URI:', postResult.uri);
// Save this: at://did:plc:xxx/app.bsky.feed.post/abc123
```

3. **Update your post with the AT-URI**

```typescript
await publisher.updateDocument(rkey, {
	// ... all original fields
	bskyPostRef: {
		uri: postResult.uri,
		cid: postResult.cid
	}
});
```

4. **Comments appear automatically**

The Comments component fetches replies from Bluesky when users visit your post.

## Programmatic Usage

If you want to fetch comments in your load function instead of client-side:

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { fetchComments } from 'svelte-standard-site/comments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const post = await getPost(params.slug); // Your database/CMS

	let comments = [];
	if (post.bskyPostUri) {
		comments = await fetchComments({
			bskyPostUri: post.bskyPostUri,
			canonicalUrl: `https://yourblog.com/blog/${params.slug}`,
			maxDepth: 3
		});
	}

	return {
		post,
		comments
	};
};
```

Then render them manually:

```svelte
<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<div class="comments">
	{#each data.comments as comment}
		<div class="comment">
			<img src={comment.author.avatar} alt={comment.author.handle} />
			<p>{comment.text}</p>
		</div>
	{/each}
</div>
```

## Functions

### fetchComments

```typescript
import { fetchComments } from 'svelte-standard-site/comments';

const comments = await fetchComments({
	bskyPostUri: 'at://did:plc:xxx/app.bsky.feed.post/abc123',
	canonicalUrl: 'https://yourblog.com/posts/my-post',
	maxDepth: 3
});

// Returns array of Comment objects
```

### fetchMentionComments

Fetch posts that mention your blog post URL (even if not replies):

```typescript
import { fetchMentionComments } from 'svelte-standard-site/comments';

const mentions = await fetchMentionComments('https://yourblog.com/posts/my-post', 3);
```

### formatRelativeTime

```typescript
import { formatRelativeTime } from 'svelte-standard-site/comments';

formatRelativeTime('2026-01-25T10:00:00Z');
// "2 hours ago"
```

## Types

```typescript
interface Comment {
	uri: string; // AT-URI of the reply
	cid: string; // Content hash
	author: CommentAuthor;
	text: string; // Comment text
	createdAt: string; // ISO date
	likeCount: number;
	replyCount: number;
	replies?: Comment[]; // Nested replies
	depth: number; // Nesting level (0 = top-level)
}

interface CommentAuthor {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
}
```

## Styling

The Comments component uses your site's design system classes. You can customize:

```svelte
<Comments
  {bskyPostUri}
  {canonicalUrl}
  class="my-12 rounded-xl border-2 p-6"
/>

<style>
  :global(.comments-section) {
    /* Custom styles */
  }
</style>
```

## Advanced Usage

### Custom Comment Renderer

Build your own comment UI:

```svelte
<script lang="ts">
	import { fetchComments, formatRelativeTime } from 'svelte-standard-site/comments';
	import { onMount } from 'svelte';

	let comments = $state([]);

	onMount(async () => {
		comments = await fetchComments({
			bskyPostUri: 'at://...',
			canonicalUrl: 'https://...'
		});
	});
</script>

<div class="comments">
	{#each comments as comment}
		<article>
			<header>
				<a href="https://bsky.app/profile/{comment.author.handle}">
					{comment.author.displayName || comment.author.handle}
				</a>
				<time>{formatRelativeTime(comment.createdAt)}</time>
			</header>

			<p>{comment.text}</p>

			{#if comment.replies}
				<!-- Recursively render replies -->
				{#each comment.replies as reply}
					<!-- ... -->
				{/each}
			{/if}
		</article>
	{/each}
</div>
```

### Combine with Mentions

Show both replies and mentions:

```typescript
const [replies, mentions] = await Promise.all([
	fetchComments({
		bskyPostUri: post.bskyPostUri,
		canonicalUrl: post.url
	}),
	fetchMentionComments(post.url)
]);

const allComments = [...replies, ...mentions];
```

### Filter by Language

```typescript
const comments = await fetchComments({
	bskyPostUri,
	canonicalUrl
});

const englishComments = comments.filter((c) => {
	// You'd need to add language detection
	return detectLanguage(c.text) === 'en';
});
```

### Moderation

Since these are from Bluesky, you can use their moderation tools:

```typescript
const comments = await fetchComments({
	bskyPostUri,
	canonicalUrl
});

// Filter out blocked users
const moderated = comments.filter((c) => {
	return !isUserBlocked(c.author.did);
});
```

## Best Practices

1. **Always include canonical URL** - Helps with mention detection
2. **Set appropriate maxDepth** - Too deep can be overwhelming (3 is good)
3. **Show "Reply on Bluesky" link** - Encourages engagement
4. **Handle loading states** - Comments load async
5. **Cache on server** - Fetch in load() for better performance
6. **Respect privacy** - Remember these are public Bluesky posts
7. **Test thoroughly** - Ensure AT-URI is correct

## Troubleshooting

### Comments Not Loading

1. **Check the AT-URI format**
   ```
   ✅ at://did:plc:xxx/app.bsky.feed.post/abc123
   ❌ https://bsky.app/profile/you.bsky.social/post/abc123
   ```
2. **Verify the post exists** - Visit it on bsky.app
3. **Check console** - Look for error messages
4. **Ensure post is public** - Private posts won't be accessible

### Wrong Comments Showing

- Double-check the AT-URI
- Make sure you're using the announcement post URI, not a reply URI

### Missing Nested Replies

- Increase `maxDepth` prop
- Check if replies are actually nested (some clients flatten threads)

### Performance Issues

- Fetch comments server-side in `load()`
- Implement pagination for posts with many comments
- Cache results

## Static Sites

For static sites (using adapter-static):

1. **Pre-build comments**

```typescript
// scripts/prebuild-comments.ts
const posts = await getAllPosts();

for (const post of posts) {
	if (post.bskyPostUri) {
		const comments = await fetchComments({
			bskyPostUri: post.bskyPostUri,
			canonicalUrl: post.url
		});

		fs.writeFileSync(`static/comments/${post.slug}.json`, JSON.stringify(comments));
	}
}
```

2. **Load from static file**

```typescript
// +page.server.ts
export const load = async ({ params }) => {
	const comments = JSON.parse(fs.readFileSync(`static/comments/${params.slug}.json`, 'utf-8'));

	return { comments };
};
```

3. **Rebuild on schedule** - Use GitHub Actions or similar to rebuild daily/weekly

## Examples

### Basic Blog Post

```svelte
<script lang="ts">
	import { Comments } from 'svelte-standard-site';

	const post = {
		title: 'My Post',
		content: '...',
		bskyPostUri: 'at://did:plc:xxx/app.bsky.feed.post/abc123'
	};
</script>

<article>
	<h1>{post.title}</h1>
	{@html post.content}
</article>

<Comments
	bskyPostUri={post.bskyPostUri}
	canonicalUrl="https://yourblog.com/posts/my-post"
/>
```

### With Loading State

```svelte
<script lang="ts">
	import { Comments } from 'svelte-standard-site';
	import { page } from '$app/stores';

	const { data } = $props();

	let commentsLoaded = $state(false);
</script>

<article>
	<!-- Post content -->
</article>

{#if data.post.bskyPostUri}
	<div class="comments-wrapper">
		{#if !commentsLoaded}
			<div class="loading">Loading comments...</div>
		{/if}

		<Comments
			bskyPostUri={data.post.bskyPostUri}
			canonicalUrl={$page.url.href}
			on:load={() => (commentsLoaded = true)}
		/>
	</div>
{/if}
```

## Next Steps

- [Publishing](./publishing.md)
- [Content Transformation](./content-transformation.md)
- [Verification](./verification.md)
