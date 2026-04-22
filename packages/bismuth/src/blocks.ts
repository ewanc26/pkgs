/**
 * Convert individual blocks from pub.leaflet.*, blog.pckt.*, and app.offprint.*
 * lexicons to Markdown strings.
 */

import { applyFacets, type FootnoteDef } from './facets.js'
import type {
  AnyBlock,
  // Leaflet
  TextBlock,
  HeaderBlock,
  BlockquoteBlock,
  CodeBlock,
  ImageBlock,
  BskyPostBlock,
  WebsiteBlock,
  OrderedListBlock,
  UnorderedListBlock,
  ListItem,
  ListItemContent,
  // Pckt
  PcktTextBlock,
  PcktHeadingBlock,
  PcktImageBlock,
  PcktBlockquoteBlock,
  PcktBulletListBlock,
  PcktOrderedListBlock,
  PcktListItem,
  // Offprint
  OffprintTextBlock,
  OffprintHeadingBlock,
  OffprintImageBlock,
  OffprintBlockquoteBlock,
  OffprintBulletListBlock,
  OffprintOrderedListBlock,
  OffprintListItem,
  OffprintTaskListBlock,
  OffprintTaskItem,
  OffprintCodeBlock,
  OffprintWebEmbedBlock,
  OffprintBlueskyPostBlock,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockResult {
  /** The Markdown string for this block. */
  markdown: string
  /** Footnote definitions collected while converting this block. */
  footnotes: FootnoteDef[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Block dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export function blockToMarkdown(block: AnyBlock): BlockResult {
  const type = block.$type

  // Extract platform and block type from $type
  // Patterns:
  // - "pub.leaflet.blocks.text" → ["pub.leaflet", "text"]
  // - "blog.pckt.block.text" → ["blog.pckt", "text"]
  // - "app.offprint.block.text" → ["app.offprint", "text"]
  const match = type.match(
    /^(pub\.leaflet|blog\.pckt|app\.offprint)\.(?:blocks?\.)?(\w+)$/,
  )
  if (!match) {
    return { markdown: `<!-- Unsupported block type: ${type} -->`, footnotes: [] }
  }

  const [, _platform, blockType] = match

  switch (blockType) {
    // ── Text ────────────────────────────────────────────────────────────────
    case 'text': {
      const b = block as TextBlock | PcktTextBlock | OffprintTextBlock
      const r = applyFacets(b.plaintext, b.facets)
      return { markdown: r.text, footnotes: r.footnotes }
    }

    // ── Heading ─────────────────────────────────────────────────────────────
    case 'header':
    case 'heading': {
      const b = block as HeaderBlock | PcktHeadingBlock | OffprintHeadingBlock
      // Offprint requires level; Leaflet/Pckt have optional level
      const level = Math.min(Math.max(b.level ?? 1, 1), 6)
      const r = applyFacets(b.plaintext, b.facets)
      return { markdown: `${'#'.repeat(level)} ${r.text}`, footnotes: r.footnotes }
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    case 'blockquote':
      return blockquoteToMarkdown(
        block as BlockquoteBlock | PcktBlockquoteBlock | OffprintBlockquoteBlock,
      )

    // ── Code block ──────────────────────────────────────────────────────────
    case 'code':
    case 'codeBlock': {
      const b = block as CodeBlock | OffprintCodeBlock
      // Leaflet uses plaintext, Offprint uses code
      const code = 'plaintext' in b ? b.plaintext : b.code
      const language = b.language ?? ''
      return { markdown: `\`\`\`${language}\n${code}\n\`\`\``, footnotes: [] }
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    case 'horizontalRule':
      return { markdown: '---', footnotes: [] }

    // ── Image ───────────────────────────────────────────────────────────────
    case 'image':
      return imageToMarkdown(block as ImageBlock | PcktImageBlock | OffprintImageBlock)

    // ── Ordered list ────────────────────────────────────────────────────────
    case 'orderedList':
      return orderedListToMarkdown(
        block as OrderedListBlock | PcktOrderedListBlock | OffprintOrderedListBlock,
      )

    // ── Unordered/Bullet list ───────────────────────────────────────────────
    case 'unorderedList':
    case 'bulletList':
      return bulletListToMarkdown(
        block as UnorderedListBlock | PcktBulletListBlock | OffprintBulletListBlock,
      )

    // ── Task list (Offprint) ────────────────────────────────────────────────
    case 'taskList':
      return taskListToMarkdown(block as OffprintTaskListBlock)

    // ── Web embed / Website ─────────────────────────────────────────────────
    case 'webEmbed':
    case 'website': {
      const b = block as WebsiteBlock | OffprintWebEmbedBlock
      const url = 'url' in b ? b.url : b.href
      const title = b.title
      const description = 'description' in b ? b.description : undefined
      if (title) {
        let md = `[${title}](${url})`
        if (description) {
          md += `\n\n${description}`
        }
        return { markdown: md, footnotes: [] }
      }
      return { markdown: url, footnotes: [] }
    }

    // ── Bluesky post ────────────────────────────────────────────────────────
    case 'bskyPost':
    case 'blueskyPost':
      return blueskyPostToMarkdown(block as BskyPostBlock | OffprintBlueskyPostBlock)

    // ── Button (Leaflet) ────────────────────────────────────────────────────
    case 'button': {
      const b = block as { text: string; url?: string }
      return {
        markdown: b.url ? `[${b.text}](${b.url})` : b.text,
        footnotes: [],
      }
    }

    // ── Math (Leaflet) ──────────────────────────────────────────────────────
    case 'math': {
      const b = block as { latex: string }
      return { markdown: `$$\n${b.latex}\n$$`, footnotes: [] }
    }

    // ── Iframe (Leaflet) ────────────────────────────────────────────────────
    case 'iframe': {
      const b = block as { url: string }
      return { markdown: `<iframe src="${b.url}"></iframe>`, footnotes: [] }
    }

    // ── Unsupported ─────────────────────────────────────────────────────────
    default:
      return { markdown: `<!-- Unsupported block: ${type} -->`, footnotes: [] }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Blockquote handlers
// ─────────────────────────────────────────────────────────────────────────────

function blockquoteToMarkdown(
  block: BlockquoteBlock | PcktBlockquoteBlock | OffprintBlockquoteBlock,
): BlockResult {
  const footnotes: FootnoteDef[] = []

  if ('plaintext' in block) {
    // Leaflet style: plaintext + facets
    const r = applyFacets(block.plaintext, block.facets)
    footnotes.push(...r.footnotes)
    return {
      markdown: r.text.split('\n').map((l) => `> ${l}`).join('\n'),
      footnotes,
    }
  }

  // Pckt/Offprint style: content array
  const parts: string[] = []
  for (const contentBlock of block.content) {
    const r = blockToMarkdown(contentBlock)
    parts.push(r.markdown)
    footnotes.push(...r.footnotes)
  }
  return {
    markdown: parts.join('\n').split('\n').map((l) => `> ${l}`).join('\n'),
    footnotes,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image handlers
// ─────────────────────────────────────────────────────────────────────────────

function imageToMarkdown(
  block: ImageBlock | PcktImageBlock | OffprintImageBlock,
): BlockResult {
  // Leaflet image
  if ('image' in block) {
    return { markdown: `![${block.alt ?? ''}]()`, footnotes: [] }
  }

  // Pckt image with attrs
  if ('attrs' in block) {
    const { src, alt } = block.attrs
    return { markdown: `![${alt ?? ''}](${src})`, footnotes: [] }
  }

  // Offprint image with blob
  const alt = block.alt ?? ''
  // Blob reference - no public URL available without ATProto context
  return { markdown: `![${alt}]()`, footnotes: [] }
}

// ─────────────────────────────────────────────────────────────────────────────
// List handlers
// ─────────────────────────────────────────────────────────────────────────────

function orderedListToMarkdown(
  block: OrderedListBlock | PcktOrderedListBlock | OffprintOrderedListBlock,
): BlockResult {
  const footnotes: FootnoteDef[] = []
  const lines: string[] = []

  // Get start index
  const start =
    'startIndex' in block
      ? (block.startIndex ?? 1)
      : 'start' in block
        ? (block.start ?? 1)
        : 1

  // Get children
  const children =
    'children' in block ? block.children : 'content' in block ? block.content : []

  // Determine item structure
  if ('children' in block) {
    // Leaflet or Offprint style
    const isLeaflet = block.$type === 'pub.leaflet.blocks.orderedList'

    if (isLeaflet) {
      // Leaflet: children have content + nested children
      function processLeafletItem(item: ListItem, counter: number, depth: number): void {
        const indent = '  '.repeat(depth)
        const r = itemContentToMarkdown(item.content)
        footnotes.push(...r.footnotes)
        lines.push(`${indent}${counter}. ${r.markdown}`)

        if (item.children && item.children.length > 0) {
          item.children.forEach((child, i) => processLeafletItem(child, i + 1, depth + 1))
        }
      }
      ;(block as OrderedListBlock).children.forEach((item, i) =>
        processLeafletItem(item, start + i, 0),
      )
    } else {
      // Offprint: children have content + children
      function processOffprintItem(item: OffprintListItem, counter: number, depth: number): void {
        const indent = '  '.repeat(depth)
        const r = applyFacets(item.content.plaintext, item.content.facets)
        footnotes.push(...r.footnotes)
        lines.push(`${indent}${counter}. ${r.text}`)

        if (item.children && item.children.length > 0) {
          item.children.forEach((child, i) => processOffprintItem(child, i + 1, depth + 1))
        }
      }
      ;(block as OffprintOrderedListBlock).children.forEach((item, i) =>
        processOffprintItem(item, start + i, 0),
      )
    }
  } else {
    // Pckt style: content is listItem array, each with content array
    function processPcktItem(item: PcktListItem, counter: number, depth: number): void {
      const indent = '  '.repeat(depth)
      // First item in content array is the text
      const textBlock = item.content.find((c) => c.$type === 'blog.pckt.block.text') as
        | PcktTextBlock
        | undefined
      if (textBlock) {
        const r = applyFacets(textBlock.plaintext, textBlock.facets)
        footnotes.push(...r.footnotes)
        lines.push(`${indent}${counter}. ${r.text}`)
      }

      // Find nested lists
      const nestedOrdered = item.content.find(
        (c) => c.$type === 'blog.pckt.block.orderedList',
      ) as PcktOrderedListBlock | undefined
      const nestedBullet = item.content.find(
        (c) => c.$type === 'blog.pckt.block.bulletList',
      ) as PcktBulletListBlock | undefined

      if (nestedOrdered) {
        const nestedStart = nestedOrdered.start ?? 1
        nestedOrdered.content.forEach((child, i) =>
          processPcktItem(child, nestedStart + i, depth + 1),
        )
      } else if (nestedBullet) {
        nestedBullet.content.forEach((child, i) => processPcktBulletItem(child, depth + 1))
      }
    }
    ;(block as PcktOrderedListBlock).content.forEach((item, i) =>
      processPcktItem(item, start + i, 0),
    )
  }

  return { markdown: lines.join('\n'), footnotes }
}

function bulletListToMarkdown(
  block: UnorderedListBlock | PcktBulletListBlock | OffprintBulletListBlock,
): BlockResult {
  const footnotes: FootnoteDef[] = []
  const lines: string[] = []

  // Determine item structure
  if ('children' in block) {
    // Leaflet or Offprint style
    const isLeaflet = block.$type === 'pub.leaflet.blocks.unorderedList'

    if (isLeaflet) {
      // Leaflet: children have content + nested children
      function processLeafletItem(item: ListItem, depth: number): void {
        const indent = '  '.repeat(depth)
        const r = itemContentToMarkdown(item.content)
        footnotes.push(...r.footnotes)
        lines.push(`${indent}- ${r.markdown}`)

        if (item.children && item.children.length > 0) {
          item.children.forEach((child) => processLeafletItem(child, depth + 1))
        }
      }
      ;(block as UnorderedListBlock).children.forEach((item) =>
        processLeafletItem(item, 0),
      )
    } else {
      // Offprint: children have content + children
      function processOffprintItem(item: OffprintListItem, depth: number): void {
        const indent = '  '.repeat(depth)
        const r = applyFacets(item.content.plaintext, item.content.facets)
        footnotes.push(...r.footnotes)
        lines.push(`${indent}- ${r.text}`)

        if (item.children && item.children.length > 0) {
          item.children.forEach((child) => processOffprintItem(child, depth + 1))
        }
      }
      ;(block as OffprintBulletListBlock).children.forEach((item) =>
        processOffprintItem(item, 0),
      )
    }
  } else {
    // Pckt style: content is listItem array
    function processPcktBulletItem(item: PcktListItem, depth: number): void {
      const indent = '  '.repeat(depth)
      const textBlock = item.content.find((c) => c.$type === 'blog.pckt.block.text') as
        | PcktTextBlock
        | undefined
      if (textBlock) {
        const r = applyFacets(textBlock.plaintext, textBlock.facets)
        footnotes.push(...r.footnotes)
        lines.push(`${indent}- ${r.text}`)
      }

      // Find nested lists
      const nestedOrdered = item.content.find(
        (c) => c.$type === 'blog.pckt.block.orderedList',
      ) as PcktOrderedListBlock | undefined
      const nestedBullet = item.content.find(
        (c) => c.$type === 'blog.pckt.block.bulletList',
      ) as PcktBulletListBlock | undefined

      if (nestedOrdered) {
        const nestedStart = nestedOrdered.start ?? 1
        nestedOrdered.content.forEach((child, i) => {
          const nestedIndent = '  '.repeat(depth + 1)
          const childTextBlock = child.content.find(
            (c) => c.$type === 'blog.pckt.block.text',
          ) as PcktTextBlock | undefined
          if (childTextBlock) {
            const r = applyFacets(childTextBlock.plaintext, childTextBlock.facets)
            footnotes.push(...r.footnotes)
            lines.push(`${nestedIndent}${nestedStart + i}. ${r.text}`)
          }
        })
      } else if (nestedBullet) {
        nestedBullet.content.forEach((child) =>
          processPcktBulletItem(child, depth + 1),
        )
      }
    }
    ;(block as PcktBulletListBlock).content.forEach((item) =>
      processPcktBulletItem(item, 0),
    )
  }

  return { markdown: lines.join('\n'), footnotes }
}

function taskListToMarkdown(block: OffprintTaskListBlock): BlockResult {
  const footnotes: FootnoteDef[] = []
  const lines: string[] = []

  function processItems(items: OffprintTaskItem[], depth: number): void {
    const indent = '  '.repeat(depth)
    for (const item of items) {
      const r = applyFacets(item.content.plaintext, item.content.facets)
      footnotes.push(...r.footnotes)
      const checkbox = item.checked ? '[x]' : '[ ]'
      lines.push(`${indent}- ${checkbox} ${r.text}`)
      if (item.children && item.children.length > 0) {
        processItems(item.children, depth + 1)
      }
    }
  }

  processItems(block.children, 0)
  return { markdown: lines.join('\n'), footnotes }
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet list item content helper
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Bluesky post handler
// ─────────────────────────────────────────────────────────────────────────────

function blueskyPostToMarkdown(
  block: BskyPostBlock | OffprintBlueskyPostBlock,
): BlockResult {
  // Offprint uses strongRef
  if ('post' in block) {
    const { uri, cid } = block.post
    // Convert at:// URI to web URL
    const webUrl = uri.startsWith('at://')
      ? `https://bsky.app/profile/${uri.replace(/^at:\/\//, '').replace(/\/[^/]+\/([^/]+)$/, '/post/$1')}`
      : uri
    return {
      markdown: `> [View Bluesky post](${webUrl})`,
      footnotes: [],
    }
  }

  // Leaflet style
  const uri = block.uri ?? block.did ?? ''
  const webUrl = uri.startsWith('at://')
    ? `https://bsky.app/profile/${uri.replace(/^at:\/\//, '').replace(/\/[^/]+\/([^/]+)$/, '/post/$1')}`
    : uri
  return {
    markdown: webUrl
      ? `> [View Bluesky post](${webUrl})`
      : `<!-- Bluesky post embed (no URI available) -->`,
    footnotes: [],
  }
}
