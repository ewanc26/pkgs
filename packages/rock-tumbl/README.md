# @ewanc26/rock-tumbl

Convert a [Tumblr](https://www.tumblr.com) blog export into
[Standard.site](https://standard.site) `site.standard.document` records.

Parsing and conversion happen locally. Nothing leaves your machine unless you
explicitly pass `--publish` (and `--upload-media` for media files).

## Install

```bash
pnpm add @ewanc26/rock-tumbl
# or run the CLI without installing
pnpm dlx @ewanc26/rock-tumbl --help
```

## Export requirements

Create an export from Tumblr's official export page:
<https://help.tumblr.com/knowledge-base/export-your-blog/>

The download is a ZIP containing `posts.zip`, an `media/` directory, and
`comments.csv`. `rock-tumbl` accepts either:

- the downloaded ZIP (it descends into the nested `posts.zip` itself), or
- the extracted `posts/` directory, or
- an extracted outer directory that still contains `posts.zip`.

Supported layouts:

| Layout | Detection | Notes |
| --- | --- | --- |
| `posts-html` | `html/<id>.html` inside `posts.zip` or `posts/html/*.html` | Current export. The HTML cover is the only post data it carries. |
| `posts-xml` | `posts/posts.xml` | Older export. Richer metadata; per-post HTML bodies are merged in when present. |

Anything else is rejected with a descriptive error rather than silently
producing an empty import.

## CLI

```bash
rock-tumbl --input <archive.zip|export-dir> --site <publication-url|at-uri> [options]
```

| Option | Description |
| --- | --- |
| `--input`, `-i` | Tumblr export ZIP or extracted directory (required) |
| `--site`, `-s` | Publication URL, or an existing publication AT URI, used as the document `site` (required) |
| `--output`, `-o` | Write converted documents as JSON to a file |
| `--dry-run` | Preview publishing without writing records (use with `--publish`) |
| `--publish` | Publish documents to Standard.site after conversion |
| `--create-publication` | Create a new `site.standard.publication` record using `--site` as its URL (requires `--publish`) |
| `--publication-name` | Publication name (required with `--create-publication`) |
| `--publication-description` | Publication description |
| `--well-known-out` | Write the verification body to a file |
| `--upload-media` | Upload referenced local media and rewrite document links (requires `--publish`) |
| `--max-media-bytes` | Skip media files larger than this (default 5242880, 5 MiB) |
| `--include-private` | Include private and draft posts (excluded by default) |
| `--handle` | AT Protocol handle, required with `--publish` |
| `--password` | App password, required with `--publish` |
| `--service` | PDS override (default `https://bsky.social`) |
| `-h`, `--help` | Show help |
| `--version` | Print the version |

Preview a conversion without touching the network:

```bash
rock-tumbl \
  --input tumblr-export.zip \
  --site https://myblog.example \
  --output preview.json
```

### Create a publication and import everything

The first import can create the publication record for you. `--site` is the
public domain where the blog will live; the new record's AT URI is then used as
the `site` of every document:

```bash
rock-tumbl \
  --input tumblr-export.zip \
  --site https://myblog.example \
  --publish \
  --create-publication \
  --publication-name "My Tumblr archive" \
  --publication-description "Posts imported from Tumblr" \
  --upload-media \
  --well-known-out .well-known-site.standard.publication \
  --handle you.bsky.social \
  --password "$ATPROTO_APP_PASSWORD"
```

The command prints the new publication AT URI and the exact body to serve from
`/.well-known/site.standard.publication` on the domain:

```text
at://did:plc:abc123/site.standard.publication/3lwafzkjqm25s
```

Deploy that file at the printed path (for a publication under
`https://myblog.example/blog`, the path is
`/.well-known/site.standard.publication/blog`) before expecting readers to
trust the records. The command also writes the body to the file given by
`--well-known-out`.

To import more posts later, reuse the existing publication instead of creating
another one:

```bash
rock-tumbl \
  --input another-export.zip \
  --site at://did:plc:abc123/site.standard.publication/3lwafzkjqm25s \
  --publish \
  --handle you.bsky.social \
  --password "$ATPROTO_APP_PASSWORD"
```

### Media

Tumblr exports reference media with relative paths such as
`../../media/200_0.png`. With `--upload-media`, `rock-tumbl` reads those files
from the export, uploads each unique file once to your PDS with
`com.atproto.repo.uploadBlob`, and rewrites the document markup to the public
`com.atproto.sync.getBlob` URL. Remote Tumblr URLs are left unchanged.

Files larger than `--max-media-bytes` are skipped with a warning and their
references stay relative. Raise the limit if your PDS accepts larger blobs.

Publish without media upload (documents only):

```bash
rock-tumbl \
  --input tumblr-export.zip \
  --site https://myblog.example \
  --publish \
  --handle you.bsky.social \
  --password "$ATPROTO_APP_PASSWORD"
```

Use an
[app password](https://bsky.app/settings/app-passwords), not your main
password, and pass it through the environment rather than shell history where
possible.

## Library

```ts
import {
  convertArchive,
  detectLayout,
  parseArchive,
} from '@ewanc26/rock-tumbl'

const detection = await detectLayout('tumblr-export.zip')
const archive = await parseArchive('tumblr-export.zip')

console.log(detection.layout, archive.posts.length, archive.blogName)

const result = convertArchive(archive.posts, {
  site: 'https://myblog.example',
  pathPrefix: '/posts/',
})

for (const document of result.documents) {
  console.log(document.path, document.title)
}
```

Lower-level helpers are exported too: `sanitizeHtml`, `htmlToMarkdown`,
`htmlToText`, `parseExportTimestamp`, `validateDocument`, `validateSite`,
`StandardSitePublisher`, `buildPublicationValue`, `normalizePublicationUrl`,
`publicationWellKnownPath`, `publicationWellKnownBody`,
`openMediaArchive`, `uploadArchiveMedia`, and `rewriteMediaReferences`.

Create a publication and upload a blob programmatically:

```ts
import { StandardSitePublisher } from '@ewanc26/rock-tumbl'

const publisher = new StandardSitePublisher({
  handle: 'you.bsky.social',
  password: process.env.ATPROTO_APP_PASSWORD!,
})

await publisher.login()

const publication = await publisher.createPublication({
  url: 'https://myblog.example',
  name: 'My Tumblr archive',
  description: 'Posts imported from Tumblr',
})

console.log(publication.uri)
// at://did:plc:…/site.standard.publication/…

const blob = await publisher.uploadBlob(bytes, 'image/png')
console.log(publisher.getBlobUrl(blob.ref.$link))
```

## What is preserved

- Post text converted to `site.standard.content.markdown`, with headings,
  emphasis, links, images, lists, blockquotes, and code fences.
- Titles from `posts.xml` or the first heading; otherwise the first line of
  the post, truncated to 80 characters.
- Tags, either from `posts.xml` or the per-post HTML footer.
- Original publication timestamps.
- Post ids as stable document paths (`/posts/post/<id>`), or the Tumblr slug
  when `posts.xml` supplies one.
- Media references (see limitations). With `--upload-media`, referenced local
  media is uploaded to the PDS and the markup is rewritten to blob URLs.

HTML is sanitised against an allow-list before conversion: unknown elements are
unwrapped, `script`/`style` content is dropped, event-handler and `data-*`
attributes are removed, and `javascript:`, `vbscript:`, and `data:` URLs are
rejected.

## Verification

Standard.site treats a record as valid only when the domain points back to it:

- **Publication:** serve the publication AT URI from
  `/.well-known/site.standard.publication` (or
  `/.well-known/site.standard.publication/<path>` for a publication under a
  subpath). `--well-known-out` writes the exact body.
- **Document:** optionally add
  `<link rel="site.standard.document" href="at://…">` to the rendered page
  head. `rock-tumbl` does not write your site, so this is up to the frontend.

## Known limitations

- **Timestamps are treated as UTC.** Tumblr's per-post HTML prints local blog
  time with no offset, so posts can appear shifted by your blog's timezone.
  `posts.xml` timestamps are parsed from their exported value instead.
- **Media upload is opt-in.** Without `--upload-media`, converted Markdown keeps
  the export's relative `media/...` references. With it, each unique local file
  is uploaded once. Files above `--max-media-bytes` (5 MiB by default) are
  skipped with a warning, and remote Tumblr URLs are left as-is.
- **No permanent Tumblr permalink in HTML-only exports.** The current export
  does not include a canonical post URL, so `postUrl` is empty and provenance
  text is omitted. Older `posts.xml` exports retain it.
- **Re-imports are idempotent for documents.** Each document's record key is
  derived deterministically from its path (the Tumblr post id or slug), and
  publishing uses `com.atproto.repo.putRecord`, so re-running an import updates
  existing records instead of creating duplicates. Use the same publication AT
  URI with `--site` on later runs rather than creating another publication;
  `--create-publication` always creates a new publication record.
- **Deleted posts are not removed.** Re-importing a smaller archive updates the
  posts it contains but leaves records for posts that disappeared from the
  export. Delete those records manually if needed.
- **HTML-only exports are flattened.** Reblog trails, quote/chat/audio/video
  structure, and comment threads are represented as markup and text, not
  typed post variants. `comments.csv` and `conversations.zip` are used only to
  infer the blog name; their contents are not imported.
- **Private and draft posts are skipped by default.** `--include-private`
  includes them, which is usually not what you want for a public publication.
- Posts with unreadable timestamps are imported with the current time and a
  warning, rather than failing the whole archive.

## Privacy

The export contains private media and personal posts. Keep it out of version
control and shared storage, and delete it when you are done. Parsing and
conversion are local. Publishing sends converted records to your own PDS, and
`--upload-media` sends the referenced media files there as well; nothing is
sent anywhere else.

## Development

```bash
pnpm --filter @ewanc26/rock-tumbl type-check
pnpm --filter @ewanc26/rock-tumbl test
```

Tests use synthetic fixtures and a temporary directory; the real export used
during development is not part of the repository.

## Support

Issues are tracked in the [pkgs](https://github.com/ewanc26/pkgs/issues)
repository.

## Licence

AGPL-3.0-only.
