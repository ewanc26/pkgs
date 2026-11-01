# @ewanc26/rock-tumbl

Convert a [Tumblr](https://www.tumblr.com) blog export into
[Standard.site](https://standard.site) `site.standard.document` records.

Parsing and conversion happen locally. Nothing leaves your machine unless you
explicitly pass `--publish`.

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
rock-tumbl --input <archive.zip|export-dir> --site <site-url> [options]
```

| Option | Description |
| --- | --- |
| `--input`, `-i` | Tumblr export ZIP or extracted directory (required) |
| `--site`, `-s` | Standard.site publication URL used as the document `site` (required) |
| `--output`, `-o` | Write converted documents as JSON to a file |
| `--dry-run` | Preview publishing without writing records (use with `--publish`) |
| `--publish` | Publish documents to Standard.site after conversion |
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

Publish to your PDS:

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
`htmlToText`, `parseExportTimestamp`, `validateDocument`, `validateSite`, and
`StandardSitePublisher`.

## What is preserved

- Post text converted to `site.standard.content.markdown`, with headings,
  emphasis, links, images, lists, blockquotes, and code fences.
- Titles from `posts.xml` or the first heading; otherwise the first line of
  the post, truncated to 80 characters.
- Tags, either from `posts.xml` or the per-post HTML footer.
- Original publication timestamps.
- Post ids as stable document paths (`/posts/post/<id>`), or the Tumblr slug
  when `posts.xml` supplies one.
- Media references (see limitations).

HTML is sanitised against an allow-list before conversion: unknown elements are
unwrapped, `script`/`style` content is dropped, event-handler and `data-*`
attributes are removed, and `javascript:`, `vbscript:`, and `data:` URLs are
rejected.

## Known limitations

- **Timestamps are treated as UTC.** Tumblr's per-post HTML prints local blog
  time with no offset, so posts can appear shifted by your blog's timezone.
  `posts.xml` timestamps are parsed from their exported value instead.
- **Media is not uploaded.** Converted Markdown keeps the export's relative
  `media/...` references and remote Tumblr URLs. Those relative links will not
  resolve on Standard.site until media upload is implemented. Unreferenced
  media is ignored.
- **No permanent Tumblr permalink in HTML-only exports.** The current export
  does not include a canonical post URL, so `postUrl` is empty and provenance
  text is omitted. Older `posts.xml` exports retain it.
- **Re-imports are not idempotent.** Publishing generates a fresh TID record
  key for each document, so running the import twice creates duplicates.
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
control and shared storage, and delete it when you are done. `rock-tumbl` never
uploads media or archive contents; publishing sends only the converted records
to your own PDS.

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
