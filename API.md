# API Reference

Complete API documentation for svelte-standard-site.

## Table of Contents

- [SiteStandardClient](#sitestandardclient)
- [Types](#types)
- [Utility Functions](#utility-functions)
- [Components](#components)
- [Configuration](#configuration)

## SiteStandardClient

The main client class for interacting with site.standard.\* records.

### Constructor

```typescript
constructor(config: SiteStandardConfig)
```

Creates a new instance of the client.

**Parameters:**

- `config` (SiteStandardConfig): Configuration object

**Example:**

```typescript
import { createClient } from 'svelte-standard-site';

const client = createClient({
	did: 'did:plc:revjuqmkvrw6fnkxppqtszpv',
	pds: 'https://cortinarius.us-west.host.bsky.network', // optional
	cacheTTL: 300000 // optional, in ms
});
```

### Methods

#### `fetchPublication`

```typescript
async fetchPublication(
  rkey: string,
  fetchFn?: typeof fetch
): Promise<AtProtoRecord<Publication> | null>
```

Fetches a single publication by its record key.

**Parameters:**

- `rkey` (string): The record key (TID) of the publication
- `fetchFn` (typeof fetch, optional): Custom fetch function for SSR

**Returns:** Promise resolving to the publication record or null if not found

**Example:**

```typescript
const pub = await client.fetchPublication('3lwafzkjqm25s');
if (pub) {
	console.log(pub.value.name);
}
```

#### `fetchAllPublications`

```typescript
async fetchAllPublications(
  fetchFn?: typeof fetch
): Promise<AtProtoRecord<Publication>[]>
```

Fetches all publications for the configured DID with automatic pagination.

**Parameters:**

- `fetchFn` (typeof fetch, optional): Custom fetch function for SSR

**Returns:** Promise resolving to an array of publication records

**Example:**

```typescript
const publications = await client.fetchAllPublications(fetch);
console.log(`Found ${publications.length} publications`);
```

#### `fetchDocument`

```typescript
async fetchDocument(
  rkey: string,
  fetchFn?: typeof fetch
): Promise<AtProtoRecord<Document> | null>
```

Fetches a single document by its record key.

**Parameters:**

- `rkey` (string): The record key (TID) of the document
- `fetchFn` (typeof fetch, optional): Custom fetch function for SSR

**Returns:** Promise resolving to the document record or null if not found

**Example:**

```typescript
const doc = await client.fetchDocument('3lxbm5kqrs2s');
if (doc) {
	console.log(doc.value.title);
}
```

#### `fetchAllDocuments`

```typescript
async fetchAllDocuments(
  fetchFn?: typeof fetch
): Promise<AtProtoRecord<Document>[]>
```

Fetches all documents for the configured DID with automatic pagination. Results are sorted by `publishedAt` (newest first).

**Parameters:**

- `fetchFn` (typeof fetch, optional): Custom fetch function for SSR

**Returns:** Promise resolving to an array of document records

**Example:**

```typescript
const documents = await client.fetchAllDocuments(fetch);
documents.forEach((doc) => {
	console.log(doc.value.title, new Date(doc.value.publishedAt));
});
```

#### `fetchDocumentsByPublication`

```typescript
async fetchDocumentsByPublication(
  publicationUri: string,
  fetchFn?: typeof fetch
): Promise<AtProtoRecord<Document>[]>
```

Fetches all documents that belong to a specific publication.

**Parameters:**

- `publicationUri` (string): AT URI of the publication
- `fetchFn` (typeof fetch, optional): Custom fetch function for SSR

**Returns:** Promise resolving to an array of document records

**Example:**

```typescript
const docs = await client.fetchDocumentsByPublication(
	'at://did:plc:xxx/site.standard.publication/3lwafzkjqm25s'
);
```

#### `fetchByAtUri`

```typescript
async fetchByAtUri<T = Publication | Document>(
  atUri: string,
  fetchFn?: typeof fetch
): Promise<AtProtoRecord<T> | null>
```

Fetches a record by its full AT URI.

**Parameters:**

- `atUri` (string): Full AT URI of the record
- `fetchFn` (typeof fetch, optional): Custom fetch function for SSR

**Returns:** Promise resolving to the record or null if not found

**Example:**

```typescript
const record = await client.fetchByAtUri(
	'at://did:plc:xxx/site.standard.publication/3lwafzkjqm25s'
);
```

#### `clearCache`

```typescript
clearCache(): void
```

Clears all cached data.

**Example:**

```typescript
client.clearCache();
```

#### `getPDS`

```typescript
async getPDS(fetchFn?: typeof fetch): Promise<string>
```

Gets the resolved PDS endpoint for the configured DID.

**Returns:** Promise resolving to the PDS URL

**Example:**

```typescript
const pds = await client.getPDS();
console.log('Using PDS:', pds);
```

## Types

### SiteStandardConfig

Configuration object for the client.

```typescript
interface SiteStandardConfig {
	/** The DID to fetch records from */
	did: string;
	/** Optional custom PDS endpoint */
	pds?: string;
	/** Cache TTL in milliseconds (default: 5 minutes) */
	cacheTTL?: number;
}
```

### Publication

Represents a site.standard.publication record.

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
```

### Document

Represents a site.standard.document record.

```typescript
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
	publishedAt: string; // ISO 8601 datetime
	updatedAt?: string; // ISO 8601 datetime
}
```

### AtProtoRecord

Generic wrapper for AT Protocol records.

```typescript
interface AtProtoRecord<T> {
	uri: string; // AT URI of the record
	cid: string; // Content identifier
	value: T; // The actual record value
}
```

### AtProtoBlob

Represents a blob (file) in AT Protocol.

```typescript
interface AtProtoBlob {
	$type: 'blob';
	ref: {
		$link: string; // CID or full URL after enhancement
	};
	mimeType: string;
	size: number;
}
```

### BasicTheme

Theme configuration for a publication.

```typescript
interface BasicTheme {
	$type: 'site.standard.theme.basic';
	accentColor?: string; // Hex color
	backgroundColor?: string; // Hex color
	textColor?: string; // Hex color
}
```

### StrongRef

Reference to another AT Protocol record.

```typescript
interface StrongRef {
	uri: string; // AT URI
	cid: string; // Content identifier
}
```

### ResolvedIdentity

Result of DID resolution.

```typescript
interface ResolvedIdentity {
	did: string;
	pds: string; // PDS endpoint URL
	handle?: string; // User handle
}
```

## Utility Functions

### AT URI Utilities

#### `parseAtUri`

```typescript
function parseAtUri(atUri: string): ParsedAtUri | null;
```

Parses an AT URI into its components.

**Example:**

```typescript
import { parseAtUri } from 'svelte-standard-site';

const parsed = parseAtUri('at://did:plc:xxx/site.standard.publication/rkey');
// { did: 'did:plc:xxx', collection: 'site.standard.publication', rkey: 'rkey' }
```

#### `atUriToHttps`

```typescript
function atUriToHttps(atUri: string, pdsEndpoint: string): string | null;
```

Converts an AT URI to an HTTPS URL for the getRecord XRPC endpoint.

**Example:**

```typescript
import { atUriToHttps } from 'svelte-standard-site';

const url = atUriToHttps(
	'at://did:plc:xxx/site.standard.publication/rkey',
	'https://pds.example.com'
);
```

#### `buildAtUri`

```typescript
function buildAtUri(did: string, collection: string, rkey: string): string;
```

Constructs an AT URI from components.

**Example:**

```typescript
import { buildAtUri } from 'svelte-standard-site';

const uri = buildAtUri('did:plc:xxx', 'site.standard.publication', 'rkey');
// 'at://did:plc:xxx/site.standard.publication/rkey'
```

#### `extractRkey`

```typescript
function extractRkey(atUri: string): string | null;
```

Extracts the record key from an AT URI.

**Example:**

```typescript
import { extractRkey } from 'svelte-standard-site';

const rkey = extractRkey('at://did:plc:xxx/site.standard.publication/3lwafzkjqm25s');
// '3lwafzkjqm25s'
```

#### `isAtUri`

```typescript
function isAtUri(uri: string): boolean;
```

Validates if a string is a valid AT URI.

**Example:**

```typescript
import { isAtUri } from 'svelte-standard-site';

console.log(isAtUri('at://did:plc:xxx/collection/rkey')); // true
console.log(isAtUri('https://example.com')); // false
```

### Agent Utilities

#### `resolveIdentity`

```typescript
async function resolveIdentity(did: string, fetchFn?: typeof fetch): Promise<ResolvedIdentity>;
```

Resolves a DID to its PDS endpoint using Slingshot.

**Example:**

```typescript
import { resolveIdentity } from 'svelte-standard-site';

const identity = await resolveIdentity('did:plc:xxx');
console.log(identity.pds); // 'https://...'
```

#### `buildPdsBlobUrl`

```typescript
function buildPdsBlobUrl(pds: string, did: string, cid: string): string;
```

Constructs a blob URL for retrieving files from a PDS.

**Example:**

```typescript
import { buildPdsBlobUrl } from 'svelte-standard-site';

const url = buildPdsBlobUrl('https://pds.example.com', 'did:plc:xxx', 'bafyrei...');
```

### Cache

#### `cache`

Global cache instance used by the library.

```typescript
const cache: Cache;
```

**Methods:**

- `get<T>(key: string): T | null` - Get cached value
- `set<T>(key: string, value: T, ttl?: number): void` - Set cached value
- `delete(key: string): void` - Delete cached value
- `clear(): void` - Clear all cached values
- `setDefaultTTL(ttl: number): void` - Set default TTL

**Example:**

```typescript
import { cache } from 'svelte-standard-site';

// Manual cache manipulation
const data = cache.get('my-key');
cache.set('my-key', { some: 'data' }, 60000);
cache.clear();
```

## Components

### PublicationCard

Displays a publication card with icon, name, description, and link.

**Props:**

```typescript
interface Props {
	publication: AtProtoRecord<Publication>;
	class?: string;
}
```

**Example:**

```svelte
<script>
	import { PublicationCard } from 'svelte-standard-site';

	export let data;
</script>

<PublicationCard publication={data.publication} class="my-custom-class" />
```

**Styling:**

The component uses scoped CSS but exposes the following classes for customization:

- `.publication-card`
- `.publication-header`
- `.publication-icon`
- `.publication-info`
- `.publication-name`
- `.publication-description`
- `.publication-link`

### DocumentCard

Displays a document card with cover image, title, description, metadata, and tags.

**Props:**

```typescript
interface Props {
	document: AtProtoRecord<Document>;
	class?: string;
	showCover?: boolean;
}
```

**Example:**

```svelte
<script>
	import { DocumentCard } from 'svelte-standard-site';

	export let data;
</script>

<DocumentCard document={data.document} showCover={true} class="my-custom-class" />
```

**Styling:**

The component uses scoped CSS but exposes the following classes:

- `.document-card`
- `.document-content`
- `.document-cover`
- `.document-body`
- `.document-title`
- `.document-description`
- `.document-meta`
- `.document-date`
- `.document-updated`
- `.document-tags`
- `.tag`

## Configuration

### Environment Variables

#### `getConfigFromEnv`

```typescript
function getConfigFromEnv(): SiteStandardConfig | null;
```

Reads configuration from environment variables.

**Environment Variables:**

- `PUBLIC_ATPROTO_DID` (required): The DID to fetch records from
- `PUBLIC_ATPROTO_PDS` (optional): Custom PDS endpoint
- `PUBLIC_CACHE_TTL` (optional): Cache TTL in milliseconds

**Example:**

```typescript
import { getConfigFromEnv } from 'svelte-standard-site/config/env';

const config = getConfigFromEnv();
if (config) {
	const client = createClient(config);
}
```

#### `validateEnv`

```typescript
function validateEnv(): void;
```

Validates that required environment variables are set. Throws an error if validation fails.

**Example:**

```typescript
import { validateEnv } from 'svelte-standard-site/config/env';

try {
	validateEnv();
} catch (error) {
	console.error('Missing required environment variables');
}
```
