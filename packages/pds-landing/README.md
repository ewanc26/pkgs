# @ewanc26/pds-landing

Composable Svelte 5 components for an ATProto PDS landing page — terminal aesthetic, live status fetching, zero config to drop in.

## Install

```bash
pnpm add @ewanc26/pds-landing @ewanc26/ui
```

## Quick start — full page

```svelte
<script>
  import { PDSPage } from '@ewanc26/pds-landing';
</script>

<!-- Drop-in: renders the complete terminal landing page -->
<PDSPage
  cardTitle="ewan's pds"
  promptUser="server"
  promptHost="pds.ewancroft.uk"
  tagline="Bluesky-compatible ATProto PDS · personal instance"
  blueskyHandle="ewancroft.uk"
/>
```

Import the PDS design tokens and base styles once in your layout:

```css
/* app.css / layout.css */
@import '@ewanc26/ui/styles/pds-tokens.css';
```

---

## Mix-and-match — primitives

All primitives are exported individually so you can compose custom layouts.

```svelte
<script>
  import {
    TerminalCard,
    PromptLine,
    Tagline,
    SectionLabel,
    Divider,
    StatusGrid,
    LinkList,
    ContactSection,
    PDSFooter,
  } from '@ewanc26/pds-landing';
</script>

<TerminalCard title="my pds">
  <PromptLine user="server" host="pds.example.com" />
  <Tagline text="My custom tagline" />

  <SectionLabel label="status" />
  <StatusGrid />          <!-- fetches live from same origin -->

  <Divider />

  <SectionLabel label="links" />
  <LinkList links={[
    { href: 'https://bsky.app', label: 'Bluesky' },
    { href: 'https://atproto.com', label: 'ATProto docs' },
  ]} />

  <Divider />

  <SectionLabel label="contact" />
  <ContactSection blueskyHandle="you.bsky.social" />
</TerminalCard>

<PDSFooter />
```

### Use raw KV data

```svelte
<script>
  import { KVGrid } from '@ewanc26/pds-landing';
  import type { KVItem } from '@ewanc26/pds-landing';

  const items: KVItem[] = [
    { key: 'status', value: '✓ online', status: 'ok' },
    { key: 'region', value: 'eu-west-1' },
    { key: 'invite', value: 'required', status: 'warn' },
  ];
</script>

<KVGrid {items} />
```

### Fetch status yourself

```ts
import { fetchPDSStatus } from '@ewanc26/pds-landing';

const { health, description, accountCount } = await fetchPDSStatus('https://pds.example.com');
```

---

## Components

| Component | Description |
|---|---|
| `PDSPage` | Full assembled landing page (convenience) |
| `TerminalCard` | Terminal window shell with traffic-light dots titlebar |
| `PromptLine` | `user@host:path $` bash prompt header |
| `Tagline` | Dimmed subtitle beneath the prompt |
| `SectionLabel` | Uppercase section heading |
| `Divider` | Thin green-tinted `<hr>` |
| `KVGrid` | Key-value grid with ok/warn/err/loading states |
| `StatusGrid` | Live-fetching PDS status grid (wraps `KVGrid`) |
| `LinkList` | `→ link` list |
| `ContactSection` | Bluesky mention + optional email |
| `PDSFooter` | Footer with nixpkgs / atproto links |

## Design tokens

All components consume CSS custom properties from `@ewanc26/ui/styles/pds-tokens.css`:

```
--pds-font-mono
--pds-color-crust / mantle / base / surface-0 / surface-1 / overlay-0
--pds-color-text / subtext-0
--pds-color-green / red / yellow / shadow
```
