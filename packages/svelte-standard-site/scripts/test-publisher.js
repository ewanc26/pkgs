/**
 * Example script to test publishing to ATProto
 *
 * Usage:
 *   ATPROTO_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" node scripts/test-publisher.js
 *
 * This script demonstrates:
 * 1. Creating a publisher instance
 * 2. Logging in
 * 3. Publishing a publication
 * 4. Publishing a document
 * 5. Listing your content
 */

import { StandardSitePublisher } from '../src/lib/publisher.js';
import { transformContent } from '../src/lib/utils/content.js';

async function main() {
	// Check for app password
	if (!process.env.ATPROTO_APP_PASSWORD) {
		console.error('Error: ATPROTO_APP_PASSWORD environment variable not set');
		console.error('');
		console.error('Get an app password at: https://bsky.app/settings/app-passwords');
		console.error('');
		console.error('Usage:');
		console.error('  ATPROTO_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" node scripts/test-publisher.js');
		process.exit(1);
	}

	console.log('🚀 Testing svelte-standard-site Publisher\n');

	// Step 1: Create publisher
	console.log('Step 1: Creating publisher instance...');
	const publisher = new StandardSitePublisher({
		identifier: process.env.ATPROTO_HANDLE || 'your-handle.bsky.social',
		password: process.env.ATPROTO_APP_PASSWORD
	});

	// Step 2: Login
	console.log('Step 2: Logging in...');
	try {
		await publisher.login();
		console.log('✅ Logged in successfully');
		console.log('   DID:', publisher.getDid());
		console.log('   PDS:', publisher.getPdsUrl());
	} catch (error) {
		console.error('❌ Login failed:', error.message);
		process.exit(1);
	}

	// Step 3: Create a publication
	console.log('\nStep 3: Creating publication...');
	try {
		const pubResult = await publisher.publishPublication({
			name: 'Test Blog',
			url: 'https://example.com',
			description: 'A test publication created by svelte-standard-site',
			basicTheme: {
				background: { r: 255, g: 250, b: 240 },
				foreground: { r: 30, g: 30, b: 30 },
				accent: { r: 74, g: 124, b: 155 },
				accentForeground: { r: 255, g: 255, b: 255 }
			}
		});

		console.log('✅ Publication created');
		console.log('   URI:', pubResult.uri);
		console.log('   CID:', pubResult.cid);
		console.log('   Rkey:', pubResult.uri.split('/').pop());
		console.log('');
		console.log('   💡 Save the rkey for verification!');
	} catch (error) {
		console.error('❌ Failed to create publication:', error.message);
	}

	// Step 4: Transform and publish a document
	console.log('\nStep 4: Publishing a test document...');

	const sampleMarkdown = `
# Test Blog Post

This is a test blog post published using \`svelte-standard-site\`.

## Features

- **Markdown support** - Full markdown formatting
- [Links](/about) are automatically resolved
- Content is transformed for ATProto compatibility

<div class="sidenote">
  <span class="sidenote-label">Note</span>
  <p>This sidenote will be converted to a markdown blockquote!</p>
</div>

## Code Example

\`\`\`typescript
import { StandardSitePublisher } from 'svelte-standard-site/publisher';

const publisher = new StandardSitePublisher({
  identifier: 'you.bsky.social',
  password: process.env.ATPROTO_APP_PASSWORD!
});

await publisher.login();
\`\`\`

Pretty cool, right?
  `.trim();

	try {
		// Transform the content
		const transformed = transformContent(sampleMarkdown, {
			baseUrl: 'https://example.com'
		});

		console.log('   Content stats:');
		console.log('   - Word count:', transformed.wordCount);
		console.log('   - Reading time:', transformed.readingTime, 'min');

		// Publish the document
		const docResult = await publisher.publishDocument({
			site: 'https://example.com',
			title: 'Test Blog Post from svelte-standard-site',
			publishedAt: new Date().toISOString(),
			path: '/posts/test-post',
			description: 'A test document to verify publishing works',
			tags: ['test', 'example', 'svelte-standard-site'],
			content: {
				$type: 'site.standard.content.markdown',
				text: transformed.markdown,
				version: '1.0'
			},
			textContent: transformed.textContent
		});

		console.log('\n✅ Document published');
		console.log('   URI:', docResult.uri);
		console.log('   CID:', docResult.cid);
		console.log('   Rkey:', docResult.uri.split('/').pop());
	} catch (error) {
		console.error('❌ Failed to publish document:', error.message);
	}

	// Step 5: List all your content
	console.log('\nStep 5: Listing your published content...');

	try {
		const [publications, documents] = await Promise.all([
			publisher.listPublications(),
			publisher.listDocuments()
		]);

		console.log(`\n📚 Publications (${publications.length}):`);
		publications.forEach((pub, i) => {
			console.log(`   ${i + 1}. ${pub.value.name}`);
			console.log(`      URL: ${pub.value.url}`);
			console.log(`      URI: ${pub.uri}`);
		});

		console.log(`\n📝 Documents (${documents.length}):`);
		documents.forEach((doc, i) => {
			console.log(`   ${i + 1}. ${doc.value.title}`);
			console.log(`      Published: ${new Date(doc.value.publishedAt).toLocaleDateString()}`);
			console.log(`      URI: ${doc.uri}`);
		});
	} catch (error) {
		console.error('❌ Failed to list content:', error.message);
	}

	console.log('\n✨ Test complete!');
	console.log('\nNext steps:');
	console.log('1. View your content on pdsls.dev:');
	console.log(`   https://pdsls.dev/at://${publisher.getDid()}/site.standard.publication`);
	console.log(`   https://pdsls.dev/at://${publisher.getDid()}/site.standard.document`);
	console.log('2. Set up verification with .well-known endpoints');
	console.log('3. Add Comments component to your blog');
	console.log('\nSee docs/ for more information!');
}

main().catch(console.error);
