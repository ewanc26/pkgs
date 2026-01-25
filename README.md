# svelte-standard-site

A comprehensive SvelteKit library for building sites powered by `site.standard.*` records from the AT Protocol. Includes a complete design system with light/dark mode support and pre-built components.

Also on [Tangled](https://tangled.org/did:plc:ofrbh253gwicbkc5nktqepol/svelte-standard-site).

## Features

- 🎨 **Complete Design System** - Beautiful, accessible design language with ink, canvas, primary, secondary, and accent color palettes
- 🌓 **Light/Dark Mode** - Built-in theme toggle with system preference detection and zero FOUC
- 🧩 **Pre-built Components** - Ready-to-use cards, layouts, and UI elements
- 🔧 **Modular Architecture** - Reusable utility components for consistent theming and formatting
- 🌍 **Internationalization** - Automatic locale-aware date formatting
- 🔄 **Automatic PDS Resolution** - Resolves DIDs to their Personal Data Server endpoints
- 📦 **Type-Safe** - Full TypeScript support with complete type definitions
- 🚀 **SSR Ready** - Works seamlessly with SvelteKit's server-side rendering
- 💾 **Built-in Caching** - Reduces API calls with intelligent caching
- 🎯 **Customizable** - All components respect `site.standard.*` lexicons while allowing full customization
- 🔗 **AT URI Support** - Parse and convert AT URIs to HTTPS URLs
- ♿ **Accessible** - WCAG compliant with proper ARIA labels and keyboard navigation

## Installation

```bash
pnpm add svelte-standard-site
# or
npm install svelte-standard-site
# or
yarn add svelte-standard-site
```

## Quick Start

### 1. Import Base Styles

In your root `+layout.svelte`:

```svelte
<script>
	import 'svelte-standard-site/styles/base.css';
</script>
```

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```env
PUBLIC_ATPROTO_DID=did:plc:your-did-here
# Optional: specify a custom PDS endpoint
PUBLIC_ATPROTO_PDS=https://your-pds.example.com
# Optional: cache TTL in milliseconds (default: 300000 = 5 minutes)
PUBLIC_CACHE_TTL=300000
```

### 3. Use the Layout Component

The simplest way to get started is with the `StandardSiteLayout` component:

```svelte
<script lang="ts">
	import { StandardSiteLayout } from 'svelte-standard-site';
</script>

<StandardSiteLayout title="My Site" showThemeToggle={true}>
	<h1>Welcome to my site!</h1>
	<p>Powered by site.standard records.</p>
</StandardSiteLayout>
```

### 4. Fetch and Display Records

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
	import { StandardSiteLayout, PublicationCard, DocumentCard } from 'svelte-standard-site';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<StandardSiteLayout title="My Publications">
	<section>
		<h2>Publications</h2>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each data.publications as publication}
				<PublicationCard {publication} />
			{/each}
		</div>
	</section>

	<section>
		<h2>Recent Posts</h2>
		<div class="space-y-6">
			{#each data.documents as document}
				<DocumentCard {document} showCover={true} />
			{/each}
		</div>
	</section>
</StandardSiteLayout>
```

## Components

### Core Components

#### StandardSiteLayout

A complete page layout with header, footer, and theme management.

```svelte
<StandardSiteLayout title="My Site" showThemeToggle={true} class="custom-class">
	{#snippet header()}
		<!-- Custom header -->
	{/snippet}

	{#snippet footer()}
		<!-- Custom footer -->
	{/snippet}

	<!-- Main content -->
</StandardSiteLayout>
```

**Props:**

- `title?: string` - Site title (default: "My Site")
- `showThemeToggle?: boolean` - Show theme toggle button (default: true)
- `class?: string` - Additional CSS classes for main container
- `header?: Snippet` - Custom header snippet (replaces default)
- `footer?: Snippet` - Custom footer snippet (replaces default)
- `children: Snippet` - Main content

### ThemeToggle

A button component for toggling between light and dark modes.

```svelte
<script>
	import { ThemeToggle } from 'svelte-standard-site';
</script>

<ThemeToggle class="my-custom-class" />
```

**Props:**

- `class?: string` - Additional CSS classes

#### DocumentCard

Displays a `site.standard.document` record with title, description, cover image, tags, and dates.

```svelte
<DocumentCard {document} showCover={true} href="/custom/path" class="custom-class" />
```

**Props:**

- `document: AtProtoRecord<Document>` - The document record (required)
- `publication?: AtProtoRecord<Publication>` - Optional publication for theme support
- `showCover?: boolean` - Show cover image (default: true)
- `href?: string` - Custom href override
- `class?: string` - Additional CSS classes

#### PublicationCard

Displays a `site.standard.publication` record with icon, name, description, and link.

```svelte
<PublicationCard {publication} showExternalIcon={true} class="custom-class" />
```

**Props:**

- `publication: AtProtoRecord<Publication>` - The publication record (required)
- `showExternalIcon?: boolean` - Show external link icon (default: true)
- `class?: string` - Additional CSS classes

### Reusable Utility Components

#### DateDisplay

Consistently formats and displays dates with automatic locale detection.

```svelte
<DateDisplay date={document.publishedAt} />
<DateDisplay date={document.updatedAt} label="Updated " showIcon={true} locale="fr-FR" />
```

**Props:**

- `date: string` - ISO date string (required)
- `label?: string` - Optional label prefix
- `class?: string` - Additional CSS classes
- `showIcon?: boolean` - Show update icon (default: false)
- `style?: string` - Inline styles
- `locale?: string` - Locale override (default: browser locale)

**Features:**

- Automatically detects user's browser locale
- Supports custom locale override
- Examples: "January 19, 2026" (en-US), "19 janvier 2026" (fr-FR)

#### TagList

Displays a list of tags with theme support.

```svelte
<TagList tags={document.tags} hasTheme={!!publication?.basicTheme} />
```

**Props:**

- `tags: string[]` - Array of tag strings (required)
- `hasTheme?: boolean` - Whether to apply custom theme (default: false)
- `class?: string` - Additional CSS classes

#### ThemedContainer

Wraps content with theme CSS variables applied.

```svelte
<ThemedContainer theme={publication.basicTheme} element="article">
	<!-- Content automatically inherits theme -->
</ThemedContainer>
```

**Props:**

- `theme?: BasicTheme` - Optional theme to apply
- `children: Snippet` - Content to wrap (required)
- `class?: string` - Additional CSS classes
- `element?: 'div' | 'article' | 'section'` - HTML element type (default: 'div')

#### ThemedText

Displays text with theme-aware colors.

```svelte
<ThemedText hasTheme={!!theme} element="h1" class="text-4xl">Title</ThemedText>
<ThemedText hasTheme={!!theme} opacity={70} element="p">Description</ThemedText>
```

**Props:**

- `hasTheme?: boolean` - Whether to apply custom theme (default: false)
- `opacity?: number` - Opacity level 0-100 (default: 100)
- `variant?: 'foreground' | 'accent'` - Color variant (default: 'foreground')
- `element?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div'` - HTML element (default: 'span')
- `class?: string` - Additional CSS classes
- `children?: any` - Content to render

#### ThemedCard

Base card component with theme support for building custom cards.

```svelte
<ThemedCard theme={publication.basicTheme} class="p-6">
	<!-- Card content -->
</ThemedCard>

<!-- With link -->
<ThemedCard theme={publication.basicTheme} href="/article" class="hover:shadow-lg">
	<!-- Clickable card content -->
</ThemedCard>
```

**Props:**

- `theme?: BasicTheme` - Optional theme to apply
- `children: Snippet` - Card content (required)
- `class?: string` - Additional CSS classes
- `href?: string` - Optional link (wraps in anchor tag)

## Design System

The library uses a comprehensive color system with semantic naming:

- **Ink** - Text colors (`ink-50` to `ink-950`)
- **Canvas** - Background colors (`canvas-50` to `canvas-950`)
- **Primary** - Primary brand colors (`primary-50` to `primary-950`)
- **Secondary** - Secondary brand colors (`secondary-50` to `secondary-950`)
- **Accent** - Accent colors (`accent-50` to `accent-950`)

All colors automatically adapt to light/dark mode using Tailwind's `light-dark()` function.

### Example Usage

```svelte
<div class="bg-canvas-50 text-ink-900 dark:bg-canvas-950 dark:text-ink-50">
	<h1 class="text-primary-600 dark:text-primary-400">Hello World</h1>
	<p class="text-ink-700 dark:text-ink-200">Supporting text</p>
</div>
```

## Theme Store

Programmatically control the theme:

```typescript
import { themeStore } from 'svelte-standard-site';

// Initialize (automatically called by ThemeToggle)
themeStore.init();

// Toggle theme
themeStore.toggle();

// Set specific theme
themeStore.setTheme(true); // dark mode
themeStore.setTheme(false); // light mode

// Subscribe to changes
themeStore.subscribe((state) => {
	console.log(state.isDark); // boolean
	console.log(state.mounted); // boolean
});
```

## Theme Utilities

Helper functions for working with theme colors:

```typescript
import {
	mixThemeColor,
	getThemedTextColor,
	getThemedBackground,
	getThemedBorder,
	getThemedAccent,
	themeToCssVars
} from 'svelte-standard-site';

// Generate color-mix CSS
const semiTransparent = mixThemeColor('--theme-foreground', 50);
// => 'color-mix(in srgb, var(--theme-foreground) 50%, transparent)'

// Get theme-aware text color
const textStyle = getThemedTextColor(hasTheme, 70);
// => { color: 'color-mix(in srgb, var(--theme-foreground) 70%, transparent)' }

// Get theme-aware background
const bgStyle = getThemedBackground(hasTheme);
// => { backgroundColor: 'var(--theme-background)' }

// Get theme-aware border
const borderStyle = getThemedBorder(hasTheme, 20);
// => { borderColor: 'color-mix(in srgb, var(--theme-foreground) 20%, transparent)' }

// Get theme-aware accent color
const accentStyle = getThemedAccent(hasTheme, 15);
// => { backgroundColor: '...', color: 'var(--theme-accent)' }

// Convert BasicTheme to CSS vars
const cssVars = themeToCssVars(publication.basicTheme);
// => { '--theme-background': 'rgb(255, 245, 235)', ... }
```

**Available Functions:**

- `mixThemeColor(variable: string, opacity: number, fallback?: string): string` - Generate color-mix CSS
- `getThemedTextColor(hasTheme: boolean, opacity?: number): { color?: string }` - Get themed text color
- `getThemedBackground(hasTheme: boolean, opacity?: number): { backgroundColor?: string }` - Get themed background
- `getThemedBorder(hasTheme: boolean, opacity?: number): { borderColor?: string }` - Get themed border
- `getThemedAccent(hasTheme: boolean, opacity?: number): { color?: string; backgroundColor?: string }` - Get themed accent
- `themeToCssVars(theme?: BasicTheme): Record<string, string>` - Convert theme to CSS variables

## Client API

### Creating a Client

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({
	did: 'did:plc:revjuqmkvrw6fnkxppqtszpv',
	pds: 'https://cortinarius.us-west.host.bsky.network', // optional
	cacheTTL: 300000 // optional, in milliseconds
});
```

### Methods

- `fetchPublication(rkey: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<Publication> | null>`
- `fetchAllPublications(fetchFn?: typeof fetch): Promise<AtProtoRecord<Publication>[]>`
- `fetchDocument(rkey: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<Document> | null>`
- `fetchAllDocuments(fetchFn?: typeof fetch): Promise<AtProtoRecord<Document>[]>`
- `fetchDocumentsByPublication(publicationUri: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<Document>[]>`
- `fetchByAtUri<T>(atUri: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<T> | null>`
- `clearCache(): void`
- `getPDS(fetchFn?: typeof fetch): Promise<string>`

## Types

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

## Customization

### Custom Styles

Override CSS variables in your own stylesheet:

```css
:root {
	--color-primary-600: oklch(70% 0.15 280); /* Custom purple */
}

[data-theme='dark'] {
	--color-primary-600: oklch(75% 0.15 280);
}
```

### Custom Layout

Create your own layout while using the theme system:

```svelte
<script lang="ts">
	import { ThemeToggle, themeStore } from 'svelte-standard-site';
	import 'svelte-standard-site/styles/base.css';
	import { onMount } from 'svelte';

	onMount(() => {
		themeStore.init();
	});
</script>

<div class="bg-canvas-50 text-ink-900 dark:bg-canvas-950 dark:text-ink-50 min-h-screen">
	<header>
		<nav>
			<a href="/">Home</a>
			<ThemeToggle />
		</nav>
	</header>

	<main>
		<slot />
	</main>

	<footer>
		<!-- Your footer -->
	</footer>
</div>
```

### Extending Components

All components accept a `class` prop for customization:

```svelte
<DocumentCard {document} class="border-primary-500 border-4 shadow-2xl" />
```

## Advanced Usage

### Building a Blog

See the [EXAMPLES.md](./EXAMPLES.md) file for a complete blog implementation example.

### Using with Different Lexicons

The library is built around `site.standard.*` lexicons but can be adapted:

```typescript
// Fetch any AT Proto record
const customRecord = await client.fetchByAtUri<CustomType>('at://did:plc:xxx/custom.lexicon/rkey');
```

## Accessibility

All components follow WCAG guidelines:

- Proper semantic HTML
- ARIA labels and roles
- Keyboard navigation support
- Focus visible indicators
- High contrast mode support
- Screen reader compatibility

## Browser Support

- Modern browsers with CSS `light-dark()` support
- Tailwind CSS v4+ required
- Svelte 5+ required

## License

[AGPL-3.0](./LICENSE)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Credits

- Built by [Ewan Croft](https://ewancroft.uk)
- Powered by [AT Protocol](https://atproto.com)
- Icons from [Lucide](https://lucide.dev)
- Typography by [Inter](https://rsms.me/inter/)

## Links

- [GitHub Repository](https://github.com/ewanc26/svelte-standard-site)
- [NPM Package](https://www.npmjs.com/package/svelte-standard-site)
- [Documentation](https://github.com/ewanc26/svelte-standard-site#readme)
- [AT Protocol Documentation](https://atproto.com)
- [site.standard Specification](https://github.com/noeleon/site.standard)
