# opal

Convert microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts.

---

## Installation

```bash
pnpm add @ewanc26/opal
```

---

## Usage

```bash
# Convert Twitter archive
opal --source twitter --input tweets.js --output posts.json

# Convert Mastodon outbox
opal --source mastodon --input outbox.json --output posts.json

# Convert and publish to Bluesky
opal --source twitter --input tweets.js --publish

# Dry run
opal --source twitter --input tweets.js --publish --dry-run
```

```typescript
import { convert } from '@ewanc26/opal';

const result = await convert({
  source: 'twitter',
  input: './tweets.js',
});

console.log(result.posts);   // MicroblogPost[]
console.log(result.skipped);  // number of skipped posts
console.log(result.errors);   // parsing errors
```

---

## Supported Platforms

| Platform | Input format | Notes |
|----------|-------------|-------|
| Twitter/X | `tweets.js` from data export | Text, media refs, replies, quotes |
| Mastodon | `outbox.json` (ActivityPub) or CSV export | HTML stripped to plain text |
| Threads | JSON export | Limited data available from Meta |
| Nostr | Event JSON array (kind 1) | Text notes, reply/quote tags |

---

## API

| Function | Description |
|----------|-------------|
| `convert(opts)` | Parse and convert posts from a platform export |
| `convertTwitter(data)` | Parse Twitter archive data |
| `convertMastodon(data)` | Parse Mastodon outbox/CSV data |
| `convertThreads(data)` | Parse Threads export data |
| `convertNostr(data)` | Parse Nostr event data |

---

## Notes

- Posts exceeding the 300-grapheme AT Protocol limit are truncated with a link to the original
- HTML content from Mastodon is stripped to plain text
- Links, mentions, and hashtags are converted to ATProto facets where possible
- Original timestamps are preserved using TID generation

---

Part of the @ewanc26/pkgs monorepo.

License: AGPL-3.0-only
