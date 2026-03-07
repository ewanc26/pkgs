# API Reference

Complete API documentation for svelte-standard-site.

## Table of Contents

- [Components](#components)
- [Stores](#stores)
- [Client](#client)
- [Types](#types)
- [Utilities](#utilities)

## Components

### StandardSiteLayout

A complete page layout with header, footer, and built-in theme management.

```typescript
interface StandardSiteLayoutProps {
	/** Site title displayed in header */
	title?: string;
	/** Custom header content (replaces default header) */
	header?: Snippet;
	/** Custom footer content (replaces default footer) */
	footer?: Snippet;
	/** Main content */
	children: Snippet;
	/** Additional CSS classes for main container */
	class?: string;
	/** Show theme toggle button in default header */
	showThemeToggle?: boolean;
}
```

**Default Values:**

- `title`: `"My Site"`
- `showThemeToggle`: `true`

**Usage:**

```svelte
<StandardSiteLayout title="My Site">
	<h1>Content here</h1>
</StandardSiteLayout>
```

**With Custom Header:**

```svelte
<StandardSiteLayout title="My Site">
	{#snippet header()}
		<nav>Custom header</nav>
	{/snippet}

	<h1>Content</h1>
</StandardSiteLayout>
```

---

### ThemeToggle

A button component for toggling between light and dark modes with smooth animations.

```typescript
interface ThemeToggleProps {
	/** Additional CSS classes */
	class?: string;
}
```

**Usage:**

```svelte
<ThemeToggle class="ml-auto" />
```

**Features:**

- Smooth icon transitions
- System preference detection
- Persistent theme storage
- Loading state indicator
- Accessible ARIA labels

---

### DocumentCard

Displays a `site.standard.document` record as a styled card with cover image, metadata, and tags.

```typescript
interface DocumentCardProps {
	/** The document record to display */
	document: AtProtoRecord<Document>;
	/** Additional CSS classes */
	class?: string;
	/** Whether to show the cover image */
	showCover?: boolean;
	/** Custom href override (defaults to /[pub_rkey]/[doc_rkey]) */
	href?: string;
}
```

**Default Values:**

- `showCover`: `true`
- `href`: Auto-generated from document URI

**Usage:**

```svelte
<DocumentCard {document} showCover={true} class="shadow-lg" />
```

**Features:**

- Responsive design
- Cover image display
- Date formatting
- Tag pills
- Hover states
- Dark mode support

---

### PublicationCard

Displays a `site.standard.publication` record with icon, description, and external link.

```typescript
interface PublicationCardProps {
	/** The publication record to display */
	publication: AtProtoRecord<Publication>;
	/** Additional CSS classes */
	class?: string;
	/** Whether to show external link icon */
	showExternalIcon?: boolean;
}
```

**Default Values:**

- `showExternalIcon`: `true`

**Usage:**

```svelte
<PublicationCard {publication} showExternalIcon={true} />
```

**Features:**

- Icon display
- Theme color support
- External link indicator
- Hover states
- Dark mode support

---

## Stores

### themeStore

A Svelte store for managing light/dark theme state.

```typescript
interface ThemeState {
	isDark: boolean;
	mounted: boolean;
}

interface ThemeStore {
	subscribe: (callback: (state: ThemeState) => void) => () => void;
	init: () => void | (() => void);
	toggle: () => void;
	setTheme: (isDark: boolean) => void;
}
```

**Methods:**

#### `init()`

Initialize the theme store. Automatically detects saved preference and system preference.

```typescript
import { themeStore } from 'svelte-standard-site';
import { onMount } from 'svelte';

onMount(() => {
	themeStore.init();
});
```

**Returns:** Optional cleanup function

#### `toggle()`

Toggle between light and dark modes.

```typescript
themeStore.toggle();
```

#### `setTheme(isDark: boolean)`

Set a specific theme mode.

```typescript
themeStore.setTheme(true); // Dark mode
themeStore.setTheme(false); // Light mode
```

#### `subscribe(callback)`

Subscribe to theme changes.

```typescript
const unsubscribe = themeStore.subscribe((state) => {
	console.log('Dark mode:', state.isDark);
	console.log('Mounted:', state.mounted);
});

// Don't forget to unsubscribe
unsubscribe();
```

**State Properties:**

- `isDark: boolean` - Current theme state (true = dark, false = light)
- `mounted: boolean` - Whether the store has been initialized

---

## Client

### SiteStandardClient

Main client for fetching AT Protocol records.

```typescript
class SiteStandardClient {
	constructor(config: SiteStandardConfig);

	// Fetch methods
	fetchPublication(
		rkey: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Publication> | null>;
	fetchAllPublications(fetchFn?: typeof fetch): Promise<AtProtoRecord<Publication>[]>;
	fetchDocument(rkey: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<Document> | null>;
	fetchAllDocuments(fetchFn?: typeof fetch): Promise<AtProtoRecord<Document>[]>;
	fetchDocumentsByPublication(
		publicationUri: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Document>[]>;
	fetchByAtUri<T>(atUri: string, fetchFn?: typeof fetch): Promise<AtProtoRecord<T> | null>;

	// Utility methods
	clearCache(): void;
	getPDS(fetchFn?: typeof fetch): Promise<string>;
}
```

### createClient()

Factory function for creating a client instance.

```typescript
function createClient(config: SiteStandardConfig): SiteStandardClient;
```

**Usage:**

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({
	did: 'did:plc:your-did-here',
	pds: 'https://your-pds.example.com', // optional
	cacheTTL: 300000 // optional, 5 minutes
});
```

---

### Methods

#### `fetchPublication(rkey, fetchFn?)`

Fetch a single publication by record key.

**Parameters:**

- `rkey: string` - The record key
- `fetchFn?: typeof fetch` - Optional custom fetch function (for SSR)

**Returns:** `Promise<AtProtoRecord<Publication> | null>`

**Example:**

```typescript
const pub = await client.fetchPublication('3lwafzkjqm25s');
if (pub) {
	console.log(pub.value.name);
}
```

---

#### `fetchAllPublications(fetchFn?)`

Fetch all publications for the configured DID.

**Parameters:**

- `fetchFn?: typeof fetch` - Optional custom fetch function

**Returns:** `Promise<AtProtoRecord<Publication>[]>`

**Example:**

```typescript
const pubs = await client.fetchAllPublications();
console.log(`Found ${pubs.length} publications`);
```

---

#### `fetchDocument(rkey, fetchFn?)`

Fetch a single document by record key.

**Parameters:**

- `rkey: string` - The record key
- `fetchFn?: typeof fetch` - Optional custom fetch function

**Returns:** `Promise<AtProtoRecord<Document> | null>`

---

#### `fetchAllDocuments(fetchFn?)`

Fetch all documents, sorted by `publishedAt` (newest first).

**Parameters:**

- `fetchFn?: typeof fetch` - Optional custom fetch function

**Returns:** `Promise<AtProtoRecord<Document>[]>`

**Example:**

```typescript
const docs = await client.fetchAllDocuments();
const latest = docs[0]; // Most recent document
```

---

#### `fetchDocumentsByPublication(publicationUri, fetchFn?)`

Fetch all documents belonging to a specific publication.

**Parameters:**

- `publicationUri: string` - AT URI of the publication
- `fetchFn?: typeof fetch` - Optional custom fetch function

**Returns:** `Promise<AtProtoRecord<Document>[]>`

**Example:**

```typescript
const docs = await client.fetchDocumentsByPublication(
	'at://did:plc:xxx/site.standard.publication/rkey'
);
```

---

#### `fetchByAtUri<T>(atUri, fetchFn?)`

Fetch any record by its AT URI.

**Parameters:**

- `atUri: string` - The AT URI
- `fetchFn?: typeof fetch` - Optional custom fetch function

**Returns:** `Promise<AtProtoRecord<T> | null>`

**Example:**

```typescript
const record = await client.fetchByAtUri<Document>('at://did:plc:xxx/site.standard.document/rkey');
```

---

#### `clearCache()`

Clear all cached data.

**Example:**

```typescript
client.clearCache();
```

---

#### `getPDS(fetchFn?)`

Get the resolved PDS endpoint for the configured DID.

**Parameters:**

- `fetchFn?: typeof fetch` - Optional custom fetch function

**Returns:** `Promise<string>`

**Example:**

```typescript
const pds = await client.getPDS();
console.log(`Using PDS: ${pds}`);
```

---

## Types

### Core Types

```typescript
interface AtProtoRecord<T> {
	uri: string;
	cid: string;
	value: T;
}

interface AtProtoBlob {
	$type: 'blob';
	ref: { $link: string };
	mimeType: string;
	size: number;
}

interface StrongRef {
	uri: string;
	cid: string;
}
```

### Publication Types

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

interface BasicTheme {
	primary: RGBColor;
	secondary: RGBColor;
	accent: RGBColor;
}

interface RGBColor {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
}

interface PublicationPreferences {
	defaultShowCoverImage?: boolean;
	allowComments?: boolean;
	allowReactions?: boolean;
}
```

### Document Types

```typescript
interface Document {
	$type: 'site.standard.document';
	site: string; // AT URI or HTTPS URL to publication
	title: string;
	path?: string;
	description?: string;
	coverImage?: AtProtoBlob;
	content?: any; // Rich content object
	textContent?: string; // Plain text fallback
	bskyPostRef?: StrongRef; // Reference to Bluesky post
	tags?: string[];
	publishedAt: string; // ISO 8601 datetime
	updatedAt?: string; // ISO 8601 datetime
}
```

### Configuration Types

```typescript
interface SiteStandardConfig {
	did: string;
	pds?: string; // Optional, auto-resolved if not provided
	cacheTTL?: number; // Cache time-to-live in milliseconds
}

interface ResolvedIdentity {
	did: string;
	pds: string;
	handle?: string;
}
```

---

## Utilities

### AT URI Utilities

#### `parseAtUri(uri: string)`

Parse an AT URI into its components.

```typescript
const parsed = parseAtUri('at://did:plc:xxx/site.standard.publication/rkey');
// Returns: { did: 'did:plc:xxx', collection: 'site.standard.publication', rkey: 'rkey' }
```

#### `buildAtUri(did: string, collection: string, rkey: string)`

Build an AT URI from components.

```typescript
const uri = buildAtUri('did:plc:xxx', 'site.standard.publication', 'rkey');
// Returns: 'at://did:plc:xxx/site.standard.publication/rkey'
```

#### `extractRkey(uri: string)`

Extract the record key from an AT URI.

```typescript
const rkey = extractRkey('at://did:plc:xxx/site.standard.publication/rkey');
// Returns: 'rkey'
```

#### `isAtUri(value: string)`

Check if a string is a valid AT URI.

```typescript
const valid = isAtUri('at://did:plc:xxx/site.standard.publication/rkey');
// Returns: true
```

#### `atUriToHttps(atUri: string, pds: string)`

Convert an AT URI to an HTTPS URL for API calls.

```typescript
const url = atUriToHttps(
	'at://did:plc:xxx/site.standard.publication/rkey',
	'https://pds.example.com'
);
// Returns: 'https://pds.example.com/xrpc/com.atproto.repo.getRecord?repo=...'
```

---

### Identity Resolution

#### `resolveIdentity(did: string, fetchFn?: typeof fetch)`

Resolve a DID to its PDS endpoint and handle.

```typescript
const identity = await resolveIdentity('did:plc:xxx');
// Returns: { did: 'did:plc:xxx', pds: 'https://...', handle: 'user.bsky.social' }
```

---

### Blob Utilities

#### `buildPdsBlobUrl(pds: string, did: string, cid: string)`

Build a URL for fetching blob content.

```typescript
const url = buildPdsBlobUrl('https://pds.example.com', 'did:plc:xxx', 'bafyrei...');
```

---

### Theme Utilities

#### `rgbToCSS(color: RGBColor)`

Convert an RGB color object to CSS rgb() string.

```typescript
const css = rgbToCSS({ r: 100, g: 150, b: 200 });
// Returns: 'rgb(100, 150, 200)'
```

#### `rgbToHex(color: RGBColor)`

Convert an RGB color object to hex string.

```typescript
const hex = rgbToHex({ r: 100, g: 150, b: 200 });
// Returns: '#6496c8'
```

#### `getThemeVars(theme: BasicTheme)`

Convert a BasicTheme to CSS custom properties object.

```typescript
const vars = getThemeVars({
	primary: { r: 100, g: 150, b: 200 },
	secondary: { r: 150, g: 100, b: 200 },
	accent: { r: 200, g: 100, b: 150 }
});
// Returns: { '--theme-primary': 'rgb(100, 150, 200)', ... }
```

---

### Document Utilities

#### `getDocumentSlug(document: AtProtoRecord<Document>)`

Generate a URL slug from a document's path or URI.

```typescript
const slug = getDocumentSlug(document);
```

#### `getDocumentUrl(document: AtProtoRecord<Document>, publicationRkey?: string)`

Generate a full URL path for a document.

```typescript
const url = getDocumentUrl(document, 'pub123');
// Returns: '/pub123/doc456' or custom path
```

---

### Cache Utilities

The library includes built-in caching with automatic expiration.

```typescript
import { cache } from 'svelte-standard-site';

// Get cached value
const value = cache.get<MyType>('my-key');

// Set cached value
cache.set('my-key', myValue, 300000); // 5 minutes TTL

// Delete cached value
cache.delete('my-key');

// Clear all cache
cache.clear();
```

---

## Environment Configuration

### getConfigFromEnv()

Read configuration from environment variables.

```typescript
import { getConfigFromEnv } from 'svelte-standard-site/config/env';

const config = getConfigFromEnv();
// Returns: { did: '...', pds: '...', cacheTTL: ... } or null
```

**Environment Variables:**

- `PUBLIC_ATPROTO_DID` - Required DID
- `PUBLIC_ATPROTO_PDS` - Optional PDS endpoint
- `PUBLIC_CACHE_TTL` - Optional cache TTL in milliseconds

### validateEnv()

Validate that required environment variables are set. Throws if missing.

```typescript
import { validateEnv } from 'svelte-standard-site/config/env';

validateEnv(); // Throws if PUBLIC_ATPROTO_DID is not set
```

---

## Error Handling

All async methods can throw errors. Always use try-catch:

```typescript
try {
	const docs = await client.fetchAllDocuments();
	// Handle success
} catch (error) {
	console.error('Failed to fetch documents:', error);
	// Handle error
}
```

## Performance Tips

1. **Pass fetch function in SSR** for proper request tracking
2. **Use caching** - it's built-in and automatic
3. **Batch requests** with `Promise.all()` when possible
4. **Clear cache** strategically if data changes frequently
5. **Pre-render static pages** for better performance

For more examples, see [EXAMPLES.md](./EXAMPLES.md).
