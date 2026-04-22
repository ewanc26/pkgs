/**
 * High-level converters:
 *   contentToMarkdown        — pub.leaflet.content → Markdown string
 *   documentToMarkdown       — site.standard.document → Markdown string (with optional YAML front matter)
 *   pcktContentToMarkdown    — blog.pckt.content → Markdown string
 *   offprintContentToMarkdown — app.offprint.content → Markdown string
 */

import { blockToMarkdown } from './blocks.js'
import { resolvePcktContent } from './blob.js'
import type { BlobResolver } from './blob.js'
import type { FootnoteDef } from './facets.js'
import type {
  LeafletContent,
  LinearDocumentPage,
  StandardDocument,
  PcktContent,
  OffprintContent,
} from './types.js'

// ─── Options ──────────────────────────────────────────────────────────────────

export interface ConvertOptions {
  /**
   * Prepend YAML front matter derived from the document metadata.
   * Only relevant for `documentToMarkdown`.
   * @default false
   */
  frontmatter?: boolean

  /**
   * Separator inserted between pages of a multi-page document.
   * @default '\n\n---\n\n'
   */
  pageBreak?: string
}

export interface PcktConvertOptions extends ConvertOptions {
  /**
   * Custom blob resolver for Pckt extended-mode content.
   * Falls back to the default PDS resolver if omitted.
   */
  blobResolver?: BlobResolver
}

// ─── Shared block-list helper ────────────────────────────────────────────────

function blocksToMarkdown(blocks: Parameters<typeof blockToMarkdown>[0][]): string {
  const parts: string[] = []
  const allFootnotes: FootnoteDef[] = []

  for (const block of blocks) {
    const r = blockToMarkdown(block)
    if (r.markdown.trim()) parts.push(r.markdown)
    allFootnotes.push(...r.footnotes)
  }

  let text = parts.join('\n\n')

  if (allFootnotes.length > 0) {
    const defs = allFootnotes
      .map((fn) => `[^${fn.index}]: ${fn.content}`)
      .join('\n')
    text += `\n\n${defs}`
  }

  return text
}

// ─── contentToMarkdown ────────────────────────────────────────────────────────

/**
 * Convert a `pub.leaflet.content` object to a Markdown string.
 *
 * Canvas pages are emitted as HTML comments because they have no
 * meaningful linear representation.
 */
export function contentToMarkdown(
  content: LeafletContent,
  opts: ConvertOptions = {},
): string {
  const sep = opts.pageBreak ?? '\n\n---\n\n'
  const pageParts: string[] = []

  for (const page of content.pages) {
    if (page.$type === 'pub.leaflet.pages.canvas') {
      pageParts.push('<!-- Canvas page: spatial layout cannot be represented in Markdown -->')
      continue
    }

    if (page.$type !== 'pub.leaflet.pages.linearDocument') {
      pageParts.push(
        `<!-- Unknown page type: ${(page as { $type: string }).$type} -->`,
      )
      continue
    }

    pageParts.push(linearPageToMarkdown(page))
  }

  return pageParts.join(sep)
}

function linearPageToMarkdown(page: LinearDocumentPage): string {
  return blocksToMarkdown(page.blocks.map(({ block }) => block))
}

// ─── pcktContentToMarkdown ───────────────────────────────────────────────────

/**
 * Convert a `blog.pckt.content` object to a Markdown string.
 *
 * Pckt content may be inline (`items` array) or extended (a blob reference).
 * Extended mode requires `sourceDid` for blob resolution; an error is thrown
 * if the DID is absent and the content uses blob mode.
 */
export async function pcktContentToMarkdown(
  content: PcktContent,
  sourceDid?: string,
  opts: PcktConvertOptions = {},
): Promise<string> {
  const blocks = await resolvePcktContent(content, sourceDid ?? '', opts.blobResolver)

  if (!sourceDid && !content.items) {
    throw new Error(
      'blog.pckt.content uses blob mode — a sourceDid is required for blob resolution.',
    )
  }

  return blocksToMarkdown(blocks)
}

// ─── offprintContentToMarkdown ────────────────────────────────────────────────

/**
 * Convert an `app.offprint.content` object to a Markdown string.
 */
export function offprintContentToMarkdown(
  content: OffprintContent,
  _opts: ConvertOptions = {},
): string {
  return blocksToMarkdown(content.items)
}

// ─── documentToMarkdown ───────────────────────────────────────────────────────

/**
 * Convert a `site.standard.document` to a Markdown string.
 *
 * When `opts.frontmatter` is true, a YAML front matter block is prepended
 * containing the document metadata (title, publishedAt, etc.). This mirrors
 * the format Sequoia expects when ingesting Markdown files.
 *
 * If the document has a `content` field (pub.leaflet.content), that is
 * converted. Otherwise the `textContent` plain-text fallback is used.
 */
export function documentToMarkdown(
  doc: StandardDocument,
  opts: ConvertOptions = {},
): string {
  const parts: string[] = []

  if (opts.frontmatter) {
    parts.push(buildFrontmatter(doc))
  }

  if (doc.content) {
    parts.push(contentToMarkdown(doc.content, opts))
  } else if (doc.textContent) {
    parts.push(doc.textContent)
  }

  return parts.join('\n\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yamlString(value: string): string {
  // Wrap in double quotes if the value contains characters that need escaping.
  const needsQuoting = /[:#\-{}\[\],&*!|>'"%@`]|^\s|\s$/.test(value) ||
    value.includes('\n')
  if (needsQuoting) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return value
}

function buildFrontmatter(doc: StandardDocument): string {
  const lines: string[] = ['---']

  lines.push(`title: ${yamlString(doc.title)}`)
  lines.push(`publishedAt: ${doc.publishedAt}`)

  if (doc.updatedAt) {
    lines.push(`updatedAt: ${doc.updatedAt}`)
  }

  if (doc.description) {
    lines.push(`description: ${yamlString(doc.description)}`)
  }

  if (doc.tags && doc.tags.length > 0) {
    lines.push('tags:')
    for (const tag of doc.tags) {
      lines.push(`  - ${yamlString(tag)}`)
    }
  }

  if (doc.path) {
    lines.push(`path: ${yamlString(doc.path)}`)
  }

  lines.push('---')
  return lines.join('\n')
}
