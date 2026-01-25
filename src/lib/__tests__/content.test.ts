/**
 * Tests for content transformation utilities
 */

import { describe, it, expect } from 'vitest';
import {
	convertSidenotes,
	resolveRelativeLinks,
	stripToPlainText,
	countWords,
	calculateReadingTime,
	transformContent
} from '../utils/content.js';

describe('convertSidenotes', () => {
	it('converts simple sidenotes to blockquotes', () => {
		const input = `
Some text before.

<div class="sidenote sidenote--tip">
  <span class="sidenote-label">Tip</span>
  <p>This is a helpful tip.</p>
</div>

Some text after.
    `.trim();

		const expected = `
Some text before.

> **Tip:** This is a helpful tip.

Some text after.
    `.trim();

		expect(convertSidenotes(input)).toBe(expected);
	});
});

describe('resolveRelativeLinks', () => {
	it('converts relative links to absolute', () => {
		const input = `
[Link to about](/about)
![Image](/images/photo.jpg)
[External link](https://example.com) should stay the same
    `.trim();

		const expected = `
[Link to about](https://myblog.com/about)
![Image](https://myblog.com/images/photo.jpg)
[External link](https://example.com) should stay the same
    `.trim();

		expect(resolveRelativeLinks(input, 'https://myblog.com')).toBe(expected);
	});

	it('handles trailing slash in base URL', () => {
		const input = '[Link](/page)';
		const expected = '[Link](https://myblog.com/page)';
		expect(resolveRelativeLinks(input, 'https://myblog.com/')).toBe(expected);
	});
});

describe('stripToPlainText', () => {
	it('removes markdown formatting', () => {
		const input = `
# Heading

This is **bold** and *italic* text.

[Link text](https://example.com)

\`code\`

\`\`\`
code block
\`\`\`
    `.trim();

		const result = stripToPlainText(input);

		expect(result).not.toContain('#');
		expect(result).not.toContain('**');
		expect(result).not.toContain('*');
		expect(result).not.toContain('[');
		expect(result).not.toContain(']');
		expect(result).not.toContain('`');
		expect(result).toContain('Heading');
		expect(result).toContain('bold');
		expect(result).toContain('italic');
		expect(result).toContain('Link text');
	});

	it('removes images', () => {
		const input = '![Alt text](/image.jpg)';
		const result = stripToPlainText(input);
		expect(result).toBe('');
	});

	it('preserves link text', () => {
		const input = '[Click here](https://example.com)';
		const result = stripToPlainText(input);
		expect(result).toBe('Click here');
	});
});

describe('countWords', () => {
	it('counts words correctly', () => {
		expect(countWords('Hello world')).toBe(2);
		expect(countWords('One two three four five')).toBe(5);
		expect(countWords('  Spaces   around   words  ')).toBe(3);
		expect(countWords('')).toBe(0);
	});
});

describe('calculateReadingTime', () => {
	it('calculates reading time', () => {
		expect(calculateReadingTime(200)).toBe(1); // 200 words = 1 minute
		expect(calculateReadingTime(400)).toBe(2); // 400 words = 2 minutes
		expect(calculateReadingTime(100)).toBe(1); // Always at least 1 minute
		expect(calculateReadingTime(0)).toBe(1); // Always at least 1 minute
	});
});

describe('transformContent', () => {
	it('performs full transformation pipeline', () => {
		const input = `
# My Blog Post

This is some **markdown** content with [relative links](/about).

<div class="sidenote">
  <span class="sidenote-label">Note</span>
  <p>Important information</p>
</div>
    `.trim();

		const result = transformContent(input, {
			baseUrl: 'https://myblog.com'
		});

		// Should have transformed markdown
		expect(result.markdown).toContain('(https://myblog.com/about)');
		expect(result.markdown).toContain('> **Note:**');

		// Should have plain text version
		expect(result.textContent).not.toContain('[');
		expect(result.textContent).not.toContain('**');
		expect(result.textContent).toContain('markdown');

		// Should have metadata
		expect(result.wordCount).toBeGreaterThan(0);
		expect(result.readingTime).toBeGreaterThan(0);
	});
});
