# Content Transformation

Content transformation utilities convert your markdown content into formats suitable for ATProto publishing.

## Why Transform Content?

When publishing to ATProto, you need to:

1. **Convert sidenotes** - HTML sidenotes → markdown blockquotes
2. **Resolve links** - Relative URLs → absolute URLs
3. **Extract plain text** - For search indexing (`textContent` field)
4. **Calculate metadata** - Word count and reading time

## Quick Start

```typescript
import { transformContent } from 'svelte-standard-site/content';

const markdown = `
# My Blog Post

This is [a link](/about) with some content.

<div class="sidenote">
  <span class="sidenote-label">Tip</span>
  <p>This is helpful information</p>
</div>
`;

const result = transformContent(markdown, {
	baseUrl: 'https://yourblog.com'
});

// result.markdown - Clean markdown for ATProto
// result.textContent - Plain text for search
// result.wordCount - Number of words
// result.readingTime - Estimated minutes to read
```

## Individual Functions

### Convert Sidenotes

Transform HTML sidenotes into markdown blockquotes:

```typescript
import { convertSidenotes, convertComplexSidenotes } from 'svelte-standard-site/content';

const input = `
<div class="sidenote sidenote--tip">
  <span class="sidenote-label">Tip</span>
  <p>This is a helpful tip</p>
</div>
`;

const output = convertSidenotes(input);
// > **Tip:** This is a helpful tip

// For complex sidenotes with multiple paragraphs:
const complex = convertComplexSidenotes(input);
```

### Resolve Relative Links

Convert relative URLs to absolute:

```typescript
import { resolveRelativeLinks } from 'svelte-standard-site/content';

const input = `
[About page](/about)
![Image](/images/photo.jpg)
`;

const output = resolveRelativeLinks(input, 'https://yourblog.com');
// [About page](https://yourblog.com/about)
// ![Image](https://yourblog.com/images/photo.jpg)
```

### Strip to Plain Text

Extract plain text from markdown:

```typescript
import { stripToPlainText } from 'svelte-standard-site/content';

const markdown = `
# Heading

This is **bold** and *italic*.

[Link](https://example.com)
`;

const plain = stripToPlainText(markdown);
// Heading
// This is bold and italic.
// Link
```

### Calculate Metadata

```typescript
import { countWords, calculateReadingTime } from 'svelte-standard-site/content';

const text = 'Your blog post content here...';
const words = countWords(text); // 42
const minutes = calculateReadingTime(words); // 1 (assumes 200 wpm)

// Custom reading speed
const slowRead = calculateReadingTime(words, 150); // Slower pace
```

## Complete Pipeline

The `transformContent` function runs all transformations:

```typescript
import { transformContent } from 'svelte-standard-site/content';

const result = transformContent(rawMarkdown, {
	baseUrl: 'https://yourblog.com',
	postPath: '/blog/my-post' // Optional
});

// Use in publisher
await publisher.publishDocument({
	site: 'https://yourblog.com',
	title: 'My Post',
	publishedAt: new Date().toISOString(),
	content: {
		$type: 'site.standard.content.markdown',
		text: result.markdown,
		version: '1.0'
	},
	textContent: result.textContent
});
```

## Use Cases

### Publishing from Markdown Files

```typescript
import fs from 'fs';
import matter from 'gray-matter';
import { transformContent } from 'svelte-standard-site/content';

const file = fs.readFileSync('./posts/my-post.md', 'utf-8');
const { data, content } = matter(file);

const transformed = transformContent(content, {
	baseUrl: 'https://yourblog.com'
});

// Now publish...
```

### SvelteKit Form Actions

```typescript
// src/routes/admin/publish/+page.server.ts
import { transformContent } from 'svelte-standard-site/content';
import type { Actions } from './$types';

export const actions = {
	publish: async ({ request }) => {
		const formData = await request.formData();
		const markdown = formData.get('content') as string;

		const transformed = transformContent(markdown, {
			baseUrl: 'https://yourblog.com'
		});

		// Publish using transformed content
	}
} satisfies Actions;
```

### Preview with Metadata

```svelte
<script lang="ts">
	import { transformContent } from 'svelte-standard-site/content';

	let markdown = $state('');
	let preview = $derived(
		transformContent(markdown, {
			baseUrl: 'https://yourblog.com'
		})
	);
</script>

<div>
	<textarea bind:value={markdown} />

	<div class="stats">
		<p>Words: {preview.wordCount}</p>
		<p>Reading time: {preview.readingTime} min</p>
	</div>

	<div class="preview">
		{@html marked(preview.markdown)}
	</div>
</div>
```

## Advanced Examples

### Custom Sidenote Formats

If you have custom sidenote HTML, create your own converter:

```typescript
function convertCustomSidenotes(markdown: string): string {
	const regex = /<aside class="note">([\s\S]*?)<\/aside>/gi;

	return markdown.replace(regex, (match, content) => {
		const clean = content.replace(/<[^>]+>/g, '').trim();
		return `\n> ${clean}\n`;
	});
}

// Use in pipeline
import { resolveRelativeLinks, stripToPlainText } from 'svelte-standard-site/content';

let transformed = convertCustomSidenotes(markdown);
transformed = resolveRelativeLinks(transformed, baseUrl);
const textContent = stripToPlainText(transformed);
```

### Preserve Certain HTML

If you want to keep some HTML in the markdown:

```typescript
function stripToPlainTextPreserveCode(markdown: string): string {
	// Extract code blocks first
	const codeBlocks: string[] = [];
	let text = markdown.replace(/```[\s\S]*?```/g, (match) => {
		codeBlocks.push(match);
		return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
	});

	// Strip other markdown
	text = stripToPlainText(text);

	// Restore code blocks
	text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => codeBlocks[parseInt(index)]);

	return text;
}
```

### Image Alt Text Extraction

Extract all image alt text for accessibility metadata:

```typescript
function extractImageAltText(markdown: string): string[] {
	const regex = /!\[([^\]]*)\]/g;
	const matches = [];
	let match;

	while ((match = regex.exec(markdown)) !== null) {
		if (match[1]) {
			matches.push(match[1]);
		}
	}

	return matches;
}

const altTexts = extractImageAltText(markdown);
// ['Photo of sunset', 'Diagram showing architecture']
```

## Best Practices

1. **Always transform before publishing** - Don't skip transformation
2. **Include textContent** - Essential for search and accessibility
3. **Use absolute URLs** - Prevents broken links on other platforms
4. **Test transformations** - Write tests for custom sidenotes
5. **Validate output** - Ensure markdown is valid before publishing
6. **Consider locale** - If using date formatting, respect user locale

## Common Issues

### Sidenotes Not Converting

Make sure the HTML structure matches exactly:

```html
<!-- This works -->
<div class="sidenote">
	<span class="sidenote-label">Note</span>
	<p>Content</p>
</div>

<!-- This won't work (missing class) -->
<div>
	<span>Note</span>
	<p>Content</p>
</div>
```

### Links Not Resolving

Ensure you're passing the base URL correctly:

```typescript
// ❌ Wrong - missing protocol
transformContent(md, { baseUrl: 'yourblog.com' });

// ✅ Correct
transformContent(md, { baseUrl: 'https://yourblog.com' });

// ✅ Also correct - trailing slash is OK
transformContent(md, { baseUrl: 'https://yourblog.com/' });
```

### Plain Text Too Long

The `textContent` field should be shorter than the markdown. If it's the same length, check that your markdown is being processed:

```typescript
const result = transformContent(markdown, options);

console.log('Markdown length:', result.markdown.length);
console.log('Text length:', result.textContent.length);
// Text should be shorter
```

## Performance Tips

For large documents, transformation can be slow. Consider:

1. **Cache results** - Don't re-transform unchanged content
2. **Transform on build** - Pre-transform content at build time
3. **Lazy load** - Transform on-demand for preview

```typescript
// Cache example
const cache = new Map();

function getCachedTransform(markdown: string, options: TransformOptions) {
	const key = `${markdown.substring(0, 100)}:${options.baseUrl}`;

	if (cache.has(key)) {
		return cache.get(key);
	}

	const result = transformContent(markdown, options);
	cache.set(key, result);
	return result;
}
```

## Next Steps

- [Publishing](./publishing.md)
- [Verification](./verification.md)
- [Comments](./comments.md)
