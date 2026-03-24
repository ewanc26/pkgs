/**
 * Convert individual pub.leaflet.blocks.* blocks to Markdown strings.
 */

import { applyFacets, type FootnoteDef } from './facets.js'
import type {
  AnyBlock,
  ListItem,
  ListItemContent,
  OrderedListBlock,
  UnorderedListBlock,
} from './types.js'

// ─── Public types ────────────────────────────────────────────────────────────

export interface BlockResult {
  /** The Markdown string for this block. */
  markdown: string
  /** Footnote definitions collected while converting this block. */
  footnotes: FootnoteDef[]
}

// ─── Block dispatcher ────────────────────────────────────────────────────────

export function blockToMarkdown(block: AnyBlock): BlockResult {
  const footnotes: FootnoteDef[] = []
  let markdown = ''

  switch (block.$type) {
    // ── Paragraph ──────────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.text': {
      const r = applyFacets(block.plaintext, block.facets)
      footnotes.push(...r.footnotes)
      markdown = r.text
      break
    }

    // ── Heading ────────────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.header': {
      const level = Math.min(Math.max(block.level ?? 1, 1), 6)
      const r = applyFacets(block.plaintext, block.facets)
      footnotes.push(...r.footnotes)
      markdown = `${'#'.repeat(level)} ${r.text}`
      break
    }

    // ── Blockquote ─────────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.blockquote': {
      const r = applyFacets(block.plaintext, block.facets)
      footnotes.push(...r.footnotes)
      markdown = r.text
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
      break
    }

    // ── Code block ─────────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.code':
      markdown = `\`\`\`${block.language ?? ''}\n${block.plaintext}\n\`\`\``
      break

    // ── Horizontal rule ────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.horizontalRule':
      markdown = '---'
      break

    // ── Image (blob ref — no public URL available) ─────────────────────────
    case 'pub.leaflet.blocks.image':
      markdown = `![${block.alt ?? ''}]()`
      break

    // ── Math ───────────────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.math':
      markdown = `$$\n${block.latex}\n$$`
      break

    // ── Button ─────────────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.button':
      markdown = block.url ? `[${block.text}](${block.url})` : block.text
      break

    // ── Bluesky post embed ─────────────────────────────────────────────────
    case 'pub.leaflet.blocks.bskyPost': {
      const uri = block.uri ?? block.did ?? ''
      // Attempt a best-effort web URL. at:// URIs look like at://did.../collection/rkey.
      const webUrl = uri.startsWith('at://')
        ? `https://bsky.app/profile/${uri.replace(/^at:\/\//, '').replace(/\/[^/]+\/([^/]+)$/, '/post/$1')}`
        : uri
      markdown = webUrl
        ? `> [View Bluesky post](${webUrl})`
        : `<!-- Bluesky post embed (no URI available) -->`
      break
    }

    // ── Iframe embed ───────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.iframe':
      // Raw HTML iframe — valid in most Markdown renderers.
      markdown = `<iframe src="${block.url}"></iframe>`
      break

    // ── External link card ─────────────────────────────────────────────────
    case 'pub.leaflet.blocks.website':
      markdown = block.title
        ? `[${block.title}](${block.url})`
        : block.url
      break

    // ── Lists ──────────────────────────────────────────────────────────────
    case 'pub.leaflet.blocks.orderedList':
    case 'pub.leaflet.blocks.unorderedList': {
      const r = listToMarkdown(block)
      footnotes.push(...r.footnotes)
      markdown = r.markdown
      break
    }

    // ── Unsupported ────────────────────────────────────────────────────────
    default: {
      const t = (block as { $type: string }).$type
      markdown = `<!-- Unsupported block: ${t} -->`
      break
    }
  }

  return { markdown, footnotes }
}

// ─── List helpers ─────────────────────────────────────────────────────────────

function itemContentToMarkdown(content: ListItemContent): BlockResult {
  const footnotes: FootnoteDef[] = []

  if (content.$type === 'pub.leaflet.blocks.image') {
    return { markdown: `![${content.alt ?? ''}]()`, footnotes }
  }

  // text or header — both have plaintext + facets
  const r = applyFacets(content.plaintext, content.facets)
  footnotes.push(...r.footnotes)
  return { markdown: r.text, footnotes }
}

function listToMarkdown(
  list: OrderedListBlock | UnorderedListBlock,
  depth = 0,
): BlockResult {
  const footnotes: FootnoteDef[] = []
  const lines: string[] = []
  const isOrdered = list.$type === 'pub.leaflet.blocks.orderedList'
  const startIndex = isOrdered
    ? ((list as OrderedListBlock).startIndex ?? 1)
    : 1

  function processItem(item: ListItem, counter: number, d: number): void {
    const indent = '  '.repeat(d)
    const marker = isOrdered ? `${counter}.` : '-'
    const r = itemContentToMarkdown(item.content)
    footnotes.push(...r.footnotes)
    lines.push(`${indent}${marker} ${r.markdown}`)

    // Nested ordered list takes priority per the lexicon spec.
    if (item.children && item.children.length > 0) {
      item.children.forEach((child, i) => processItem(child, i + 1, d + 1))
    } else if (item.orderedListChildren) {
      const s = item.orderedListChildren.startIndex ?? 1
      item.orderedListChildren.children.forEach((child, i) =>
        processItem(child, s + i, d + 1),
      )
    } else if (item.unorderedListChildren) {
      item.unorderedListChildren.children.forEach((child, i) =>
        processItem(child, i + 1, d + 1),
      )
    }
  }

  list.children.forEach((item, i) => processItem(item, startIndex + i, depth))

  return { markdown: lines.join('\n'), footnotes }
}
