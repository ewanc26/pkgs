# Opal: Source Format → Bluesky Post Mapping

Reference for converting microblog exports from Twitter, Mastodon, Threads, and Nostr into `app.bsky.feed.post` records.

---

## Target: `app.bsky.feed.post`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | ✓ | Max 300 grapheme clusters, 3000 UTF-8 bytes |
| `createdAt` | string | ✓ | ISO 8601 datetime |
| `facets` | `app.bsky.richtext.facet[]` | | Rich text annotations (links, mentions, tags) |
| `reply` | `{ root: StrongRef, parent: StrongRef }` | | Both root and parent are `com.atproto.repo.strongRef` (`uri` + `cid`) |
| `embed` | union | | `images`, `external`, `record`, `recordWithMedia` |
| `langs` | `string[]` | | BCP-47 language tags |
| `tags` | `string[]` | | Free-form tags |

### Facet byte offsets

Facet `index.byteStart` and `index.byteEnd` are **UTF-8 byte positions**, not character indices. When converting from platforms that use character indices (Twitter) or HTML offsets (Mastodon), recalculate to UTF-8 bytes.

### Strong refs for replies

Replies require both `root` and `parent` as `{ uri, cid }`. The `cid` is only available after the referenced post is created — this means **posts must be imported in chronological order within a thread**, and the publisher must track the `uri` → `cid` mapping for previously created posts.

### Image embeds

`app.bsky.embed.images` supports up to 4 images. Each requires:
- `image` — a blob (uploaded via `com.atproto.repo.uploadBlob`)
- `alt` — alt text (empty string if unknown)
- `aspectRatio` — optional `{ width, height }`

### Quote posts

`app.bsky.embed.record` takes a `{ uri, cid }` strong ref to the quoted post. Only works for AT Protocol records — external quotes become `app.bsky.embed.external` cards instead.

---

## Twitter/X Archive

### Source file

`tweets.js` — JavaScript assigning to `window.YTD.tweets.part0` (newer) or `window.YTD.tweet.part0` (older). Each entry is wrapped in `{ tweet: { ... } }`.

### Timestamp format

```
Thu Nov 03 13:21:02 +0000 2022
```
Parseable directly by `new Date(ts)`.

### Field mapping

| Twitter field | Bluesky field | Transform |
|---------------|---------------|-----------|
| `full_text` | `text` | Strip `t.co` URLs (replace with expanded). Truncate at 300 graphemes. |
| `created_at` | `createdAt` | Parse Twitter format → ISO 8601 |
| `entities.urls[]` | `facets[]` (link) | Replace `t.co` short URL in text with `expanded_url`. Facet byte offsets on the expanded URL. |
| `entities.hashtags[]` | `facets[]` (tag) | Convert character `indices` to UTF-8 byte offsets. `tag` = `text` value (without `#`). |
| `entities.user_mentions[]` | `facets[]` (mention) | **Cannot resolve DID from screen name.** Store as link facet to `https://bsky.app/profile/[handle]` if handle exists, otherwise skip. |
| `entities.media[]` | `embed.images[]` | Upload via `uploadBlob`, max 4 per post. `alt` = empty (no alt text in archive). |
| `extended_entities.media[]` | `embed.images[]` | Same as above — prefer `extended_entities` over `entities` (includes all media, not just first). |
| `in_reply_to_status_id_str` | `reply.parent.uri` | Must map to AT URI of already-imported parent post. Requires import ordering. |
| `conversation_id_str` | `reply.root.uri` | First tweet in conversation = root. Must be imported first. |
| `quoted_status_id_str` | `embed.record` | Only if the quoted tweet was also imported. Otherwise, use `embed.external` with the Twitter URL. |
| `retweeted_status` | — | **Skip.** Retweets are someone else's content. |
| `lang` | `langs[]` | Map Twitter lang code to BCP-47 (mostly the same). |

### Key gotchas

- **`t.co` URL replacement**: Twitter replaces all URLs with `t.co` shortlinks. The archive stores both `url` (t.co) and `expanded_url` (original). Replace the `t.co` URL in `full_text` with the `expanded_url` before computing facet byte offsets.
- **Media indices overlap**: Media entities have indices in `full_text` pointing to the `t.co` link. After replacing URLs, these indices shift. Process URL replacements first, then recompute positions.
- **Thread reconstruction**: The archive doesn't give you a thread tree. Reconstruct by grouping on `conversation_id_str` and following `in_reply_to_status_id_str` chains. Posts must be imported oldest-first within each thread.
- **Quote tweets of external content**: If `quoted_status` is not in the archive, the quote is of a tweet by someone else. Use `app.bsky.embed.external` with `quoted_status_permalink.expanded` as the URL.
- **Split archive files**: Large archives may split into `tweet-part1.js`, `tweet-part2.js`, etc.

### Example tweet → Bluesky record

```json
// Twitter input
{
  "id_str": "123456",
  "created_at": "Thu Nov 03 13:21:02 +0000 2022",
  "full_text": "Hello world! https://t.co/abc123 #nostr @someone",
  "entities": {
    "urls": [{ "url": "https://t.co/abc123", "expanded_url": "https://example.com", "indices": [13, 36] }],
    "hashtags": [{ "text": "nostr", "indices": [37, 44] }],
    "user_mentions": [{ "screen_name": "someone", "indices": [45, 56] }]
  }
}

// Bluesky output
{
  "$type": "app.bsky.feed.post",
  "text": "Hello world! https://example.com #nostr @someone",
  "createdAt": "2022-11-03T13:21:02.000Z",
  "facets": [
    { "index": { "byteStart": 13, "byteEnd": 31 }, "features": [{ "$type": "app.bsky.richtext.facet#link", "uri": "https://example.com" }] },
    { "index": { "byteStart": 32, "byteEnd": 39 }, "features": [{ "$type": "app.bsky.richtext.facet#tag", "tag": "nostr" }] },
    { "index": { "byteStart": 40, "byteEnd": 49 }, "features": [{ "$type": "app.bsky.richtext.facet#link", "uri": "https://bsky.app/profile/someone.bsky.social" }] }
  ]
}
```

---

## Mastodon

### Source file

`outbox.json` — ActivityStreams 2.0 `OrderedCollection` or `OrderedCollectionPage`. Posts are in `orderedItems[]`, each a `Create` activity wrapping a `Note` object.

### Timestamp format

ISO 8601: `"2024-01-15T10:30:00Z"` — already compatible with Bluesky.

### Field mapping

| Mastodon field | Bluesky field | Transform |
|----------------|---------------|-----------|
| `object.content` | `text` | Strip HTML tags. Decode entities. Preserve `<br>` → `\n`. Truncate at 300 graphemes. |
| `object.published` | `createdAt` | Already ISO 8601. |
| `object.tag[]` (Hashtag) | `facets[]` (tag) | Find `#tag` in stripped text, compute UTF-8 byte offsets. |
| `object.tag[]` (Mention) | `facets[]` (mention) | **Cannot resolve DID from ActivityPub `href`.** Store as link facet to the profile URL. |
| `object.attachment[]` | `embed.images[]` | Upload via `uploadBlob`. Max 4. Use `attachment.name` as alt text if available. |
| `object.inReplyTo` | `reply.parent.uri` | ActivityPub URI — cannot map to AT URI without resolution. Store as reference; skip reply ref if parent not imported. |
| `object.sensitive` + `object.summary` | — | **No CW/sensitive equivalent in Bluesky.** Prepend `[CW: summary] ` to text if `sensitive` is true. |

### Key gotchas

- **HTML content**: Mastodon toots are HTML. Must strip tags, decode entities, and convert `<br>` to newlines before any facet computation.
- **Hashtag positions shift**: After HTML stripping, the character positions of `#tags` change. Must search for tags in the stripped text, not use any HTML-level offsets.
- **Mentions are `@handle@instance`**: After stripping, mentions appear as `@user@instance.tld` or `@user`. The `tag.href` is the ActivityPub actor URI — cannot directly convert to a Bluesky DID.
- **No content warnings**: Bluesky has no CW/sensitive field. Options: prepend CW text, skip it, or add a `⚠️` prefix.
- **Media types**: Mastodon attachments have `type: "Document"` with `mediaType`. Filter for images (`image/*`). Videos have no Bluesky equivalent (would need `app.bsky.embed.video` which is limited).
- **Paginated outbox**: Large outboxes may use `OrderedCollection` with `first` → `next` pagination. The export ZIP should contain the full flattened outbox, but verify.
- **Boosts**: `Announce` activities in the outbox are boosts (shares of others' posts). Skip these — they're not original content.

### Example toot → Bluesky record

```json
// Mastodon input (ActivityPub Note)
{
  "type": "Note",
  "content": "<p>Hello from <a href=\"https://mastodon.social/@user\">@user</a>! <a href=\"https://example.com\">example.com</a></p><p>#nostr #activitypub</p>",
  "published": "2024-01-15T10:30:00Z",
  "tag": [
    { "type": "Mention", "href": "https://mastodon.social/@user", "name": "@user@mastodon.social" },
    { "type": "Hashtag", "name": "#nostr", "href": "https://mastodon.social/tags/nostr" },
    { "type": "Hashtag", "name": "#activitypub", "href": "https://mastodon.social/tags/activitypub" }
  ],
  "attachment": [
    { "type": "Document", "mediaType": "image/png", "url": "https://files.mastodon.social/media/abc.png", "name": "A screenshot" }
  ]
}

// Bluesky output
{
  "$type": "app.bsky.feed.post",
  "text": "Hello from @user! example.com\n\n#nostr #activitypub",
  "createdAt": "2024-01-15T10:30:00Z",
  "facets": [
    { "index": { "byteStart": 11, "byteEnd": 16 }, "features": [{ "$type": "app.bsky.richtext.facet#link", "uri": "https://mastodon.social/@user" }] },
    { "index": { "byteStart": 18, "byteEnd": 29 }, "features": [{ "$type": "app.bsky.richtext.facet#link", "uri": "https://example.com" }] },
    { "index": { "byteStart": 31, "byteEnd": 37 }, "features": [{ "$type": "app.bsky.richtext.facet#tag", "tag": "nostr" }] },
    { "index": { "byteStart": 38, "byteEnd": 50 }, "features": [{ "$type": "app.bsky.richtext.facet#tag", "tag": "activitypub" }] }
  ],
  "embed": {
    "$type": "app.bsky.embed.images",
    "images": [{ "image": { "$type": "blob", "ref": "...", "mimeType": "image/png", "size": 12345 }, "alt": "A screenshot" }]
  }
}
```

---

## Threads

### Source file

`posts_1.json` — Instagram-archive-shaped JSON. No official schema published by Meta.

### Timestamp format

Unix epoch seconds (integer) in the archive. Convert to ISO 8601.

### Field mapping

| Threads field | Bluesky field | Transform |
|---------------|---------------|-----------|
| `title` | `text` | Post caption/text. Truncate at 300 graphemes. |
| `creation_timestamp` | `createdAt` | Unix seconds → ISO 8601 |
| `media[].uri` | `embed.images[]` | Local path in archive. Upload via `uploadBlob`. Max 4. |
| `media[].title` | `embed.images[].alt` | Use media title as alt text if available. |

### Key gotchas

- **Undocumented format**: Meta doesn't publish a schema. The structure is inferred from community reverse-engineering. Handle both `title` at root level and `media[].title` as fallback.
- **No reply/quote data**: The export doesn't reliably include reply chains or quote references. These relationships must be inferred or skipped.
- **No hashtags/mentions**: The export doesn't include structured entity data. Could regex-detect `#hashtags` and `@mentions` in text, but no reliable offset data.
- **Timestamp is Unix seconds**: `creation_timestamp` is an integer, not a string. Convert with `new Date(ts * 1000).toISOString()`.
- **Media may be missing**: The archive references local file paths (`media/posts/abcd.jpg`) but the files may not exist in the export.
- **Instagram-shaped**: Threads exports reuse the Instagram/Accounts Center export structure. The `posts_1.json` file may be under `your_instagram_activity/threads/` or `content/` depending on the export version.

### Example Threads post → Bluesky record

```json
// Threads input
{
  "title": "Just joined Threads!",
  "creation_timestamp": 1700000000,
  "media": [
    { "uri": "media/posts/12345.jpg", "title": "Just joined Threads!" }
  ]
}

// Bluesky output
{
  "$type": "app.bsky.feed.post",
  "text": "Just joined Threads!",
  "createdAt": "2023-11-14T22:13:20.000Z",
  "embed": {
    "$type": "app.bsky.embed.images",
    "images": [{ "image": { "$type": "blob", "ref": "...", "mimeType": "image/jpeg", "size": 12345 }, "alt": "Just joined Threads!" }]
  }
}
```

---

## Nostr

### Source file

JSON array of Nostr events (kind 1 = text notes). May also be NDJSON or wrapped in `{ events: [...] }`.

### Timestamp format

Unix epoch seconds (integer) in `created_at`. Convert to ISO 8601.

### Field mapping

| Nostr field | Bluesky field | Transform |
|-------------|---------------|-----------|
| `content` | `text` | Plain text. Truncate at 300 graphemes. |
| `created_at` | `createdAt` | Unix seconds → ISO 8601 |
| `tags[]` where `[0] === "t"` | `facets[]` (tag) | Find `#tag` in content, compute UTF-8 byte offsets. `tag` = second element. |
| `tags[]` where `[0] === "r"` | `facets[]` (link) | Find URL in content, compute byte offsets. `uri` = second element. |
| `tags[]` where `[0] === "p"` | `facets[]` (mention) | **Cannot resolve DID from npub.** Store as link facet to `nostr:npub1...` or skip. |
| `tags[]` where `[0] === "e"` + marker `"root"` | `reply.root` | Nostr event ID → must map to AT URI of imported post. |
| `tags[]` where `[0] === "e"` + marker `"reply"` | `reply.parent` | Same — requires import ordering and URI mapping. |
| `tags[]` where `[0] === "q"` | `embed.record` | Quoted event — only if also imported. Otherwise `embed.external` with `nostr:nevent1...` URI. |
| `tags[]` where `[0] === "imeta"` | `embed.images[]` | Parse `imeta` tag for `url`, `m`, `alt`, `dim`. Upload via `uploadBlob`. |

### Key gotchas

- **`nostr:` URI scheme**: Content may contain `nostr:npub1...` or `nostr:nevent1...` references. These are human-readable but not resolvable to Bluesky DIDs. Convert to link facets.
- **NIP-10 marked `e` tags**: Modern events use `["e", id, relay, marker]` where marker is `"root"` or `"reply"`. Older events use positional `e` tags without markers — the last `e` tag is the parent, the first is the root.
- **`q` tags for quotes**: NIP-18 defines `["q", event_id, relay_url, author_pubkey]` for quote references. These map to `app.bsky.embed.record` if the quoted event was also imported.
- **`imeta` for media**: NIP-92 defines `imeta` tags with space-delimited key/value pairs: `url`, `m` (MIME type), `alt`, `dim` (dimensions). Parse these for image embeds.
- **Kind 6 = reposts**: Skip these — they're reposts of others' content, like Twitter retweets.
- **No content warnings**: Nostr has no CW mechanism. Some clients use a convention of putting CW text in the first line before a `\n\n`, but this is not standardised.

### Example Nostr event → Bluesky record

```json
// Nostr input
{
  "id": "abc123",
  "pubkey": "def456",
  "created_at": 1710000000,
  "kind": 1,
  "content": "Hello Nostr! #nostr https://example.com",
  "tags": [
    ["t", "nostr"],
    ["r", "https://example.com"]
  ],
  "sig": "..."
}

// Bluesky output
{
  "$type": "app.bsky.feed.post",
  "text": "Hello Nostr! #nostr https://example.com",
  "createdAt": "2024-03-09T16:00:00.000Z",
  "facets": [
    { "index": { "byteStart": 12, "byteEnd": 18 }, "features": [{ "$type": "app.bsky.richtext.facet#tag", "tag": "nostr" }] },
    { "index": { "byteStart": 19, "byteEnd": 37 }, "features": [{ "$type": "app.bsky.richtext.facet#link", "uri": "https://example.com" }] }
  ]
}
```

---

## Cross-platform concerns

### Reply threading

All four platforms represent replies differently, and none can directly reference a Bluesky post. The publisher must:

1. **Import posts in chronological order within each thread** (oldest first).
2. **Maintain a mapping** of `platform:originalId` → `{ uri, cid }` for every successfully created post.
3. **Resolve reply references** using this mapping when creating subsequent posts.
4. **Skip reply refs** where the parent hasn't been imported (orphan replies become standalone posts).

### Media upload flow

Images must be uploaded as blobs before the post record is created:

1. Fetch/download the image from the source URL or local path.
2. Upload via `com.atproto.repo.uploadBlob` — returns `{ blob: { ref, mimeType, size } }`.
3. Include the blob ref in `embed.images[].image`.
4. Max 4 images per post. Max 1MB per blob.

### Text truncation

When a post exceeds 300 grapheme clusters:
- Truncate to 299 graphemes + `…`
- Set `truncated: true` on the `MicroblogPost`
- Optionally append a facet link to the original post URL

### Mention resolution

No source platform stores Bluesky DIDs. Options:
- **Link facet**: Point to the original profile URL (Twitter, Mastodon) or `nostr:npub1...` (Nostr). User can click through.
- **Skip**: Don't create mention facets for unresolved handles.
- **Best-effort lookup**: Resolve the source handle to a Bluesky DID via `com.atproto.identity.resolveHandle` — but this only works if the person has the same handle on Bluesky.

### Language detection

- Twitter provides `lang` (e.g. `"en"`, `"und"`). Map to BCP-47.
- Mastodon has `contentMap` but no explicit lang field per toot. Infer from content or skip.
- Threads and Nostr don't provide language metadata. Use `und` or detect from content.
