# @ewanc26/bismuth

Convert [`pub.leaflet`](https://github.com/hyperlink-academy/leaflet) RTF-block documents — as stored in [`site.standard.document`](https://standard.site) ATProto records — to Markdown.

## Installation

```sh
# Global CLI
npm install -g @ewanc26/bismuth

# Project dependency
pnpm add @ewanc26/bismuth
```

## CLI

```
bismuth [options] [file]

Arguments:
  file                  JSON file to read. Reads stdin if omitted.

Options:
  -f, --frontmatter     Emit YAML front matter from document metadata.
  -p, --page-break STR  Separator between pages (default: "\n\n---\n\n").
  -o, --output FILE     Write output to FILE instead of stdout.
  -h, --help            Show help and exit.
      --version         Print version and exit.
```

The input JSON should be either a `site.standard.document` object or a bare `pub.leaflet.content` object.

```sh
# Convert a document file fetched from the PDS
cat doc.json | bismuth --frontmatter > post.md

# With custom page separator
bismuth --page-break $'\n<!-- page -->\n' doc.json
```

## Library

```typescript
import { documentToMarkdown, contentToMarkdown } from '@ewanc26/bismuth'

// Full site.standard.document (with optional YAML front matter)
const markdown = documentToMarkdown(doc, { frontmatter: true })

// Just the pub.leaflet.content block tree
const markdown = contentToMarkdown(content)
```

### `documentToMarkdown(doc, opts?)`

Converts a `site.standard.document` to Markdown. When `opts.frontmatter` is `true`, a YAML front matter block is prepended containing title, publishedAt, description, tags, and path.

### `contentToMarkdown(content, opts?)`

Converts a `pub.leaflet.content` to Markdown. Multi-page documents are joined with `opts.pageBreak` (default `\n\n---\n\n`). Canvas pages emit an HTML comment since their spatial layout cannot be represented linearly.

### `blockToMarkdown(block)`

Converts a single `AnyBlock` to a `{ markdown, footnotes }` result.

### `applyFacets(plaintext, facets?)`

Applies `pub.leaflet.richtext.facet` byte-slice annotations to a plaintext string, returning annotated Markdown. Handles bold, italic, inline code, links, strikethrough, underline, highlight, and footnotes (rendered as `[^n]` references).

## Block support

| Block type | Markdown output |
|---|---|
| `text` | Paragraph with facet annotations |
| `header` | `#`–`######` heading |
| `blockquote` | `> ...` |
| `code` | Fenced code block |
| `horizontalRule` | `---` |
| `image` | `![alt]()` (blob refs have no public URL) |
| `math` | `$$` block |
| `button` | `[text](url)` or plain text |
| `bskyPost` | Linked blockquote |
| `iframe` | Raw `<iframe>` HTML |
| `website` | `[title](url)` |
| `orderedList` | Numbered list (with nesting) |
| `unorderedList` | Bullet list (with nesting) |
| `canvas`, `poll`, `page` | HTML comment |

## Facet support

| Facet | Markdown |
|---|---|
| `bold` | `**text**` |
| `italic` | `*text*` |
| `code` | `` `text` `` |
| `link` | `[text](uri)` |
| `strikethrough` | `~~text~~` |
| `underline` | `<u>text</u>` |
| `highlight` | `==text==` |
| `footnote` | `text[^n]` + definition block |
| `didMention`, `atMention`, `id` | Pass-through (no Markdown equivalent) |

## Licence

AGPL-3.0-only
