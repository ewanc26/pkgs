# @ewanc26/og

Dynamic OpenGraph image generator with noise backgrounds, bold typography, and Satori-based rendering. Works in SvelteKit endpoints, edge runtimes, and build scripts.

## Features

- **Bold, identifiably personal design** — massive typography, ALL CAPS site names, unique per-page noise
- **@ewanc26/noise integration** — deterministic noise backgrounds seeded by title
- **Zero native dependencies** — works in Node.js, edge runtimes, and browsers
- **SvelteKit helpers** — drop-in endpoint creation
- **Customisable** — colours, fonts, templates

## Quick Start

```bash
pnpm add @ewanc26/og
```

### SvelteKit Endpoint

```ts
// src/routes/og/[...path]/+server.ts
import { createOgEndpoint } from '@ewanc26/og';

export const GET = createOgEndpoint({
  siteName: 'ewancroft.uk',
  defaultTemplate: 'blog',
  cacheMaxAge: 86400, // 24 hours
});
```

Use in your page:

```svelte
<script>
  import { createOgImageUrl } from '@ewanc26/og';
</script>

<svelte:head>
  <meta property="og:image" content={createOgImageUrl('/og', {
    title: data.post.title,
    description: data.post.excerpt,
  })} />
</svelte:head>
```

### Direct Generation

```ts
import { generateOgImage } from '@ewanc26/og';
import { writeFileSync } from 'fs';

const png = await generateOgImage({
  title: 'My Blog Post',
  description: 'A compelling description',
  siteName: 'ewancroft.uk',
  template: 'blog', // 'blog' | 'profile' | 'default'
});

writeFileSync('./og-image.png', png);
```

## Templates

### `blog` (default)

Massive title (72px), ALL CAPS site name, noise background, accent bar. Optimised for blog posts and articles.

### `profile`

Centered layout with prominent avatar. Works well for user pages, about pages.

### `default`

Bold but minimal. Good for generic pages.

## Customisation

### Colours

```ts
await generateOgImage({
  title: 'My Page',
  siteName: 'mysite.com',
  colors: {
    background: '#1a1a2e',
    text: '#ffffff',
    accent: '#00d4ff',
  },
});
```

### Fonts

Package bundles Inter. Override with custom fonts:

```ts
await generateOgImage({
  title: 'My Page',
  siteName: 'mysite.com',
  fonts: {
    heading: './static/fonts/CustomFont-Bold.ttf',
    body: './static/fonts/CustomFont-Regular.ttf',
  },
});
```

### Noise

Disable or customise noise:

```ts
await generateOgImage({
  title: 'My Page',
  siteName: 'mysite.com',
  noise: {
    enabled: true,
    opacity: 0.3,
    colorMode: 'grayscale',
  },
  noiseSeed: 'custom-seed', // optional, defaults to title
});
```

## API

### `generateOgImage(options): Promise<Buffer>`

Generate PNG buffer.

### `generateOgImageDataUrl(options): Promise<string>`

Generate base64 data URL.

### `createOgEndpoint(options): RequestHandler`

Create SvelteKit GET handler.

### `createOgImageUrl(baseUrl, params): string`

Build OG image URL with query parameters.

## License

AGPL-3.0-only
