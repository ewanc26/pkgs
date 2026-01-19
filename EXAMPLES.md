# svelte-standard-site Examples

This file contains comprehensive examples of using svelte-standard-site in various scenarios.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Simple Blog](#simple-blog)
- [Using Utility Components](#using-utility-components)
- [Building Custom Cards](#building-custom-cards)
- [Multi-Publication Site](#multi-publication-site)
- [Custom Styling](#custom-styling)
- [Custom Layout](#custom-layout)
- [Programmatic Theme Control](#programmatic-theme-control)
- [Internationalization](#internationalization)
- [Server-Side Rendering](#server-side-rendering)

## Basic Setup

### 1. Install and Configure

```bash
pnpm add svelte-standard-site
```

Create `.env`:

```env
PUBLIC_ATPROTO_DID=did:plc:your-did-here
```

### 2. Root Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import 'svelte-standard-site/styles/base.css';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children()}
```

### 3. Home Page

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { StandardSiteLayout, PublicationCard } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<StandardSiteLayout title="My Site">
	<h1>Welcome!</h1>

	<div class="grid gap-6 md:grid-cols-3">
		{#each data.publications as publication}
			<PublicationCard {publication} />
		{/each}
	</div>
</StandardSiteLayout>
```

## Simple Blog

### Load Function

```typescript
// src/routes/blog/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { getConfigFromEnv } from 'svelte-standard-site/config/env';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const config = getConfigFromEnv();
	if (!config) {
		throw new Error('Missing AT Proto configuration');
	}

	const client = createClient(config);
	const documents = await client.fetchAllDocuments(fetch);

	return {
		posts: documents
	};
};
```

### Blog Index Page

```svelte
<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
	import { StandardSiteLayout, DocumentCard } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<StandardSiteLayout title="My Blog">
	<div class="mb-8">
		<h1 class="text-ink-900 dark:text-ink-50 text-4xl font-bold">Blog Posts</h1>
		<p class="text-ink-700 dark:text-ink-200 mt-2">Thoughts, tutorials, and updates</p>
	</div>

	<div class="space-y-6">
		{#each data.posts as post}
			<DocumentCard document={post} showCover={true} />
		{/each}
	</div>
</StandardSiteLayout>
```

### Individual Post Page

```typescript
// src/routes/blog/[pub_rkey]/[doc_rkey]/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { getConfigFromEnv } from 'svelte-standard-site/config/env';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const config = getConfigFromEnv();
	if (!config) {
		throw new Error('Missing configuration');
	}

	const client = createClient(config);
	const document = await client.fetchDocument(params.doc_rkey, fetch);

	if (!document) {
		throw error(404, 'Post not found');
	}

	return {
		post: document
	};
};
```

```svelte
<!-- src/routes/blog/[pub_rkey]/[doc_rkey]/+page.svelte -->
<script lang="ts">
	import { StandardSiteLayout } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const post = $derived(data.post.value);

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{post.title} - My Blog</title>
	{#if post.description}
		<meta name="description" content={post.description} />
	{/if}
</svelte:head>

<StandardSiteLayout title="My Blog">
	<article class="mx-auto prose prose-lg dark:prose-invert">
		{#if post.coverImage}
			<img src={post.coverImage} alt={post.title} class="w-full rounded-xl" />
		{/if}

		<header class="mb-8">
			<h1>{post.title}</h1>
			<div class="text-ink-600 dark:text-ink-400 flex gap-4 text-sm">
				<time datetime={post.publishedAt}>
					{formatDate(post.publishedAt)}
				</time>
				{#if post.updatedAt}
					<span>Updated: {formatDate(post.updatedAt)}</span>
				{/if}
			</div>
			{#if post.tags && post.tags.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each post.tags as tag}
						<span
							class="bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-full px-3 py-1 text-xs font-medium"
						>
							{tag}
						</span>
					{/each}
				</div>
			{/if}
		</header>

		{@html post.content || post.textContent || ''}
	</article>
</StandardSiteLayout>
```

## Using Utility Components

The modular utility components make it easy to build consistent, theme-aware UIs.

### Using DateDisplay

```svelte
<script lang="ts">
	import { DateDisplay } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<article>
	<h1>{data.post.value.title}</h1>
	
	<!-- Simple date display -->
	<DateDisplay date={data.post.value.publishedAt} />
	
	<!-- With label and icon -->
	<DateDisplay 
		date={data.post.value.updatedAt} 
		label="Last updated: " 
		showIcon={true} 
		class="text-sm text-ink-600 dark:text-ink-400"
	/>
	
	<!-- Custom locale -->
	<DateDisplay date={data.post.value.publishedAt} locale="fr-FR" />
</article>
```

### Using TagList

```svelte
<script lang="ts">
	import { TagList } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const hasTheme = $derived(!!data.publication?.value.basicTheme);
</script>

<!-- Simple tag list -->
<TagList tags={data.post.value.tags || []} />

<!-- With theme support -->
<TagList 
	tags={data.post.value.tags || []} 
	{hasTheme} 
	class="mt-4"
/>
```

### Using ThemedText

```svelte
<script lang="ts">
	import { ThemedText } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const hasTheme = $derived(!!data.publication?.value.basicTheme);
</script>

<!-- Title with theme -->
<ThemedText {hasTheme} element="h1" class="text-4xl font-bold mb-4">
	{data.post.value.title}
</ThemedText>

<!-- Semi-transparent description -->
<ThemedText {hasTheme} opacity={70} element="p" class="text-lg">
	{data.post.value.description}
</ThemedText>

<!-- Accent color for links -->
<ThemedText {hasTheme} variant="accent" element="span">
	Read more →
</ThemedText>
```

### Combining Utility Components

```svelte
<script lang="ts">
	import { 
		ThemedContainer, 
		ThemedText, 
		DateDisplay, 
		TagList 
	} from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const theme = $derived(data.publication?.value.basicTheme);
	const hasTheme = $derived(!!theme);
</script>

<ThemedContainer {theme} element="article" class="p-8">
	<!-- Title -->
	<ThemedText {hasTheme} element="h1" class="text-4xl font-bold mb-2">
		{data.post.value.title}
	</ThemedText>
	
	<!-- Description -->
	<ThemedText {hasTheme} opacity={70} element="p" class="text-lg mb-4">
		{data.post.value.description}
	</ThemedText>
	
	<!-- Metadata -->
	<div class="flex gap-4 mb-6">
		<DateDisplay date={data.post.value.publishedAt} />
		{#if data.post.value.updatedAt}
			<DateDisplay 
				date={data.post.value.updatedAt} 
				label="Updated " 
				showIcon={true}
			/>
		{/if}
	</div>
	
	<!-- Tags -->
	<TagList tags={data.post.value.tags || []} {hasTheme} />
	
	<!-- Content -->
	<div class="prose max-w-none mt-8">
		{@html data.post.value.content}
	</div>
</ThemedContainer>
```

## Building Custom Cards

Use ThemedCard and utility components to build custom card layouts.

### Blog Post Card

```svelte
<script lang="ts">
	import { 
		ThemedCard, 
		ThemedText, 
		DateDisplay, 
		TagList 
	} from 'svelte-standard-site';
	import type { Document, Publication, AtProtoRecord } from 'svelte-standard-site';

	interface Props {
		document: AtProtoRecord<Document>;
		publication?: AtProtoRecord<Publication>;
	}

	let { document, publication }: Props = $props();
	
	const theme = $derived(publication?.value.basicTheme);
	const hasTheme = $derived(!!theme);
	const value = $derived(document.value);
</script>

<ThemedCard {theme} href="/blog/{document.uri.split('/').pop()}" class="hover:shadow-lg transition-shadow">
	<div class="flex gap-6">
		{#if value.coverImage}
			<img 
				src={value.coverImage} 
				alt={value.title} 
				class="w-32 h-32 object-cover rounded-lg"
			/>
		{/if}
		
		<div class="flex-1">
			<ThemedText {hasTheme} element="h3" class="text-2xl font-bold mb-2">
				{value.title}
			</ThemedText>
			
			{#if value.description}
				<ThemedText {hasTheme} opacity={70} element="p" class="mb-4 line-clamp-2">
					{value.description}
				</ThemedText>
			{/if}
			
			<div class="flex items-center gap-4 mb-3">
				<DateDisplay date={value.publishedAt} class="text-sm" />
			</div>
			
			{#if value.tags?.length}
				<TagList tags={value.tags} {hasTheme} />
			{/if}
		</div>
	</div>
</ThemedCard>
```

### Author Card

```svelte
<script lang="ts">
	import { ThemedCard, ThemedText } from 'svelte-standard-site';
	
	interface Props {
		name: string;
		bio: string;
		avatar?: string;
		theme?: any;
	}
	
	let { name, bio, avatar, theme }: Props = $props();
	const hasTheme = $derived(!!theme);
</script>

<ThemedCard {theme} class="p-6">
	<div class="flex items-start gap-4">
		{#if avatar}
			<img src={avatar} alt={name} class="w-16 h-16 rounded-full" />
		{/if}
		
		<div>
			<ThemedText {hasTheme} element="h3" class="text-xl font-bold mb-2">
				{name}
			</ThemedText>
			
			<ThemedText {hasTheme} opacity={70} element="p">
				{bio}
			</ThemedText>
		</div>
	</div>
</ThemedCard>
```

### Feature Card with Icon

```svelte
<script lang="ts">
	import { ThemedCard, ThemedText } from 'svelte-standard-site';
	import type { Snippet } from 'svelte';
	
	interface Props {
		title: string;
		description: string;
		icon: Snippet;
		theme?: any;
	}
	
	let { title, description, icon, theme }: Props = $props();
	const hasTheme = $derived(!!theme);
</script>

<ThemedCard {theme} class="p-6 text-center">
	<div class="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-100 dark:bg-primary-900">
		{@render icon()}
	</div>
	
	<ThemedText {hasTheme} element="h3" class="text-xl font-bold mb-2">
		{title}
	</ThemedText>
	
	<ThemedText {hasTheme} opacity={70} element="p">
		{description}
	</ThemedText>
</ThemedCard>
```

## Internationalization

### Automatic Locale Detection

The DateDisplay component automatically detects the user's browser locale.

```svelte
<script lang="ts">
	import { DateDisplay } from 'svelte-standard-site';
</script>

<!-- Automatically formats based on user's locale -->
<DateDisplay date="2026-01-19T12:00:00Z" />

<!-- 
Results:
- en-US: "January 19, 2026"
- fr-FR: "19 janvier 2026"
- de-DE: "19. Januar 2026"
- ja-JP: "2026年1月19日"
- es-ES: "19 de enero de 2026"
-->
```

### Explicit Locale Override

```svelte
<script lang="ts">
	import { DateDisplay } from 'svelte-standard-site';
	
	// User preference from settings or profile
	let userLocale = $state('fr-FR');
</script>

<DateDisplay date="2026-01-19T12:00:00Z" locale={userLocale} />
```

### Multi-Language Blog

```svelte
<script lang="ts">
	import { 
		StandardSiteLayout, 
		ThemedContainer,
		ThemedText,
		DateDisplay 
	} from 'svelte-standard-site';
	import type { PageData } from './$types';
	
	const { data }: { data: PageData } = $props();
	
	// Detect user's language
	let locale = $state('en-US');
	
	$effect(() => {
		if (typeof navigator !== 'undefined') {
			locale = navigator.language || 'en-US';
		}
	});
	
	const theme = $derived(data.publication?.value.basicTheme);
	const hasTheme = $derived(!!theme);
</script>

<StandardSiteLayout title={data.publication?.value.name}>
	<ThemedContainer {theme}>
		<ThemedText {hasTheme} element="h1" class="text-4xl font-bold mb-4">
			{data.post.value.title}
		</ThemedText>
		
		<!-- Date automatically formats to user's locale -->
		<DateDisplay 
			date={data.post.value.publishedAt} 
			{locale}
			class="text-sm text-ink-600 dark:text-ink-400"
		/>
		
		<div class="prose max-w-none mt-8">
			{@html data.post.value.content}
		</div>
	</ThemedContainer>
</StandardSiteLayout>
```

##  Multi-Publication Site

```typescript
// src/routes/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { getConfigFromEnv } from 'svelte-standard-site/config/env';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const config = getConfigFromEnv();
	if (!config) {
		return { error: 'Configuration missing', publications: [], documents: [] };
	}

	const client = createClient(config);

	const [publications, documents] = await Promise.all([
		client.fetchAllPublications(fetch),
		client.fetchAllDocuments(fetch)
	]);

	// Group documents by publication
	const documentsByPub = new Map();
	for (const doc of documents) {
		const pubUri = doc.value.site;
		if (!documentsByPub.has(pubUri)) {
			documentsByPub.set(pubUri, []);
		}
		documentsByPub.get(pubUri).push(doc);
	}

	return {
		publications,
		documents,
		documentsByPub: Object.fromEntries(documentsByPub)
	};
};
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { StandardSiteLayout, PublicationCard, DocumentCard } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<StandardSiteLayout title="My Publications">
	{#each data.publications as publication}
		<section class="mb-16">
			<div class="mb-8">
				<PublicationCard {publication} />
			</div>

			<h2 class="text-ink-900 dark:text-ink-50 mb-6 text-2xl font-bold">
				Recent from {publication.value.name}
			</h2>

			{#if data.documentsByPub[publication.uri]}
				<div class="space-y-6">
					{#each data.documentsByPub[publication.uri].slice(0, 5) as document}
						<DocumentCard {document} />
					{/each}
				</div>
			{:else}
				<p class="text-ink-600 dark:text-ink-400">No documents yet</p>
			{/if}
		</section>
	{/each}
</StandardSiteLayout>
```

## Custom Styling

### Override Theme Colors

```css
/* src/app.css or src/lib/styles/custom.css */
@import 'svelte-standard-site/styles/base.css';

/* Override primary color */
:root {
	--color-primary-50: oklch(18.2% 0.018 280);
	--color-primary-100: oklch(26.5% 0.03 280);
	--color-primary-200: oklch(40.5% 0.048 280);
	--color-primary-300: oklch(54% 0.065 280);
	--color-primary-400: oklch(66.5% 0.08 280);
	--color-primary-500: oklch(78.5% 0.095 280);
	--color-primary-600: oklch(82.2% 0.078 280);
	--color-primary-700: oklch(86.5% 0.062 280);
	--color-primary-800: oklch(91% 0.042 280);
	--color-primary-900: oklch(95.8% 0.022 280);
	--color-primary-950: oklch(98% 0.012 280);
}
```

### Custom Component Styles

```svelte
<script lang="ts">
	import { DocumentCard } from 'svelte-standard-site';
</script>

<DocumentCard
	{document}
	class="
    border-primary-500 
    border-2 
    shadow-2xl 
    transition-transform 
    hover:scale-105
  "
/>
```

## Custom Layout

### Full Custom Layout with Theme Support

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import 'svelte-standard-site/styles/base.css';
	import { ThemeToggle, themeStore } from 'svelte-standard-site';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Navigation items
	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/blog', label: 'Blog' },
		{ href: '/about', label: 'About' }
	];

	onMount(() => {
		themeStore.init();
	});
</script>

<svelte:head>
	<script>
		// Prevent FOUC
		(function () {
			const stored = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const isDark = stored === 'dark' || (!stored && prefersDark);
			const htmlElement = document.documentElement;

			if (isDark) {
				htmlElement.classList.add('dark');
				htmlElement.style.colorScheme = 'dark';
			} else {
				htmlElement.classList.remove('dark');
				htmlElement.style.colorScheme = 'light';
			}
		})();
	</script>
</svelte:head>

<div class="bg-canvas-50 text-ink-900 dark:bg-canvas-950 dark:text-ink-50 min-h-screen">
	<!-- Custom Header -->
	<header
		class="border-canvas-200 bg-canvas-50/90 dark:border-canvas-800 dark:bg-canvas-950/90 border-b backdrop-blur-md"
	>
		<nav class="container mx-auto flex items-center justify-between px-4 py-4">
			<a href="/" class="text-primary-600 dark:text-primary-400 text-2xl font-bold"> MyBrand </a>

			<ul class="flex items-center gap-6">
				{#each navItems as item}
					<li>
						<a
							href={item.href}
							class="hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors
                {$page.url.pathname === item.href
								? 'text-primary-600 dark:text-primary-400'
								: 'text-ink-700 dark:text-ink-200'}"
						>
							{item.label}
						</a>
					</li>
				{/each}
				<li>
					<ThemeToggle />
				</li>
			</ul>
		</nav>
	</header>

	<!-- Main Content -->
	<main class="container mx-auto px-4 py-12">
		{@render children()}
	</main>

	<!-- Custom Footer -->
	<footer
		class="border-canvas-200 bg-canvas-50 dark:border-canvas-800 dark:bg-canvas-950 border-t py-8"
	>
		<div class="text-ink-700 dark:text-ink-200 container mx-auto px-4 text-center text-sm">
			<p>&copy; {new Date().getFullYear()} MyBrand. All rights reserved.</p>
			<p class="mt-2">
				Powered by
				<a
					href="https://github.com/ewanc26/svelte-standard-site"
					class="text-primary-600 dark:text-primary-400 hover:underline"
				>
					svelte-standard-site
				</a>
			</p>
		</div>
	</footer>
</div>
```

## Programmatic Theme Control

### Theme Toggle Button

```svelte
<script lang="ts">
	import { themeStore } from 'svelte-standard-site';
	import { onMount } from 'svelte';

	let isDark = $state(false);

	onMount(() => {
		themeStore.init();

		const unsubscribe = themeStore.subscribe((state) => {
			isDark = state.isDark;
		});

		return unsubscribe;
	});
</script>

<button onclick={() => themeStore.toggle()} class="bg-primary-600 rounded-lg px-4 py-2 text-white">
	Switch to {isDark ? 'Light' : 'Dark'} Mode
</button>
```

### System Preference Detection

```svelte
<script lang="ts">
	import { themeStore } from 'svelte-standard-site';
	import { onMount } from 'svelte';

	let systemPreference = $state<'light' | 'dark'>('light');
	let currentTheme = $state<'light' | 'dark' | 'system'>('system');

	onMount(() => {
		themeStore.init();

		// Detect system preference
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		systemPreference = mediaQuery.matches ? 'dark' : 'light';

		// Check if user has overridden
		const stored = localStorage.getItem('theme');
		currentTheme = stored ? (stored as 'light' | 'dark') : 'system';

		// Listen for changes
		mediaQuery.addEventListener('change', (e) => {
			systemPreference = e.matches ? 'dark' : 'light';
		});
	});

	function setTheme(theme: 'light' | 'dark' | 'system') {
		if (theme === 'system') {
			localStorage.removeItem('theme');
			themeStore.setTheme(systemPreference === 'dark');
		} else {
			themeStore.setTheme(theme === 'dark');
		}
		currentTheme = theme;
	}
</script>

<div class="flex gap-2">
	<button
		onclick={() => setTheme('light')}
		class="rounded px-4 py-2 {currentTheme === 'light'
			? 'bg-primary-600 text-white'
			: 'bg-canvas-200'}"
	>
		Light
	</button>
	<button
		onclick={() => setTheme('dark')}
		class="rounded px-4 py-2 {currentTheme === 'dark'
			? 'bg-primary-600 text-white'
			: 'bg-canvas-200'}"
	>
		Dark
	</button>
	<button
		onclick={() => setTheme('system')}
		class="rounded px-4 py-2 {currentTheme === 'system'
			? 'bg-primary-600 text-white'
			: 'bg-canvas-200'}"
	>
		System
	</button>
</div>
```

## Server-Side Rendering

### Pre-render Static Pages

```typescript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: null,
			precompress: false
		}),
		prerender: {
			entries: ['*']
		}
	}
};
```

### Generate Dynamic Routes

```typescript
// src/routes/blog/[pub_rkey]/[doc_rkey]/+page.server.ts
import { createClient } from 'svelte-standard-site';
import { getConfigFromEnv } from 'svelte-standard-site/config/env';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const config = getConfigFromEnv();
	if (!config) throw error(500, 'Configuration missing');

	const client = createClient(config);
	const document = await client.fetchDocument(params.doc_rkey, fetch);

	if (!document) throw error(404, 'Post not found');

	return { post: document };
};

export const entries: EntryGenerator = async () => {
	const config = getConfigFromEnv();
	if (!config) return [];

	const client = createClient(config);
	const documents = await client.fetchAllDocuments();

	return documents.map((doc) => {
		const pubRkey = doc.value.site.split('/').pop() || '';
		const docRkey = doc.uri.split('/').pop() || '';
		return { pub_rkey: pubRkey, doc_rkey: docRkey };
	});
};
```

## Tips and Best Practices

1. **Always import base.css** in your root layout for consistent styling
2. **Use the ThemeToggle component** or manage theme with themeStore
3. **Leverage utility components** - Use DateDisplay, TagList, ThemedText, etc. for consistency
4. **Follow DRY principles** - Don't manually format dates or apply theme colors repeatedly
5. **Leverage the design tokens** (ink, canvas, primary, etc.) for consistency
6. **Pass custom classes** to components for one-off customizations
7. **Use server-side rendering** for better SEO and performance
8. **Cache aggressively** - the library has built-in caching
9. **Handle errors gracefully** - always check for null/undefined data
10. **Test dark mode** - all components support it out of the box
11. **Embrace locale-aware dates** - DateDisplay automatically formats for user's locale

For more examples and detailed documentation, visit the [GitHub repository](https://github.com/ewanc26/svelte-standard-site).
