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
import { convertData, parseTwitterArchive } from '@ewanc26/opal';

// For Twitter: extract the JSON array from the JS wrapper first
const raw = await readFile('tweets.js', 'utf-8');
const data = parseTwitterArchive(raw);

// For other platforms: just parse the JSON
// const data = JSON.parse(raw);

const result = convertData('twitter', data);

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
| `convertData(source, data)` | Parse and convert posts from pre-parsed platform data |
| `parseTwitterArchive(raw)` | Extract JSON array from Twitter archive JS wrapper |
| `convertTwitter(data)` | Parse Twitter archive data |
| `convertMastodon(data)` | Parse Mastodon outbox/CSV data |
| `convertThreads(data)` | Parse Threads export data |
| `convertNostr(data)` | Parse Nostr event data |
| `splitToThread(post)` | Split a long post into a Bluesky thread |
| `publishRecords(agent, posts, dryRun, callbacks)` | Publish posts to AT Protocol |

---

## Notes

- Posts exceeding the 300-grapheme AT Protocol limit are automatically split into Bluesky threads
- HTML content from Mastodon is stripped to plain text
- Links, mentions, and hashtags are converted to ATProto facets where possible
- Original timestamps are preserved using TID-based record keys
- The library entry has zero Node.js dependencies — safe for browser use

---

Part of the @ewanc26/pkgs monorepo.

License: AGPL-3.0-only
