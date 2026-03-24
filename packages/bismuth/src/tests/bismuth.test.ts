import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { applyFacets } from '../facets.js'
import { blockToMarkdown } from '../blocks.js'
import { contentToMarkdown, documentToMarkdown } from '../convert.js'
import type {
  Facet,
  TextBlock,
  HeaderBlock,
  CodeBlock,
  BlockquoteBlock,
  OrderedListBlock,
  UnorderedListBlock,
  LeafletContent,
  StandardDocument,
} from '../types.js'

// ─── applyFacets ──────────────────────────────────────────────────────────────

describe('applyFacets', () => {
  it('returns plaintext unchanged when no facets', () => {
    const { text } = applyFacets('hello world', undefined)
    assert.equal(text, 'hello world')
  })

  it('applies bold', () => {
    const facets: Facet[] = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{ $type: 'pub.leaflet.richtext.facet#bold' }],
      },
    ]
    const { text } = applyFacets('hello world', facets)
    assert.equal(text, '**hello** world')
  })

  it('applies italic', () => {
    const facets: Facet[] = [
      {
        index: { byteStart: 6, byteEnd: 11 },
        features: [{ $type: 'pub.leaflet.richtext.facet#italic' }],
      },
    ]
    const { text } = applyFacets('hello world', facets)
    assert.equal(text, 'hello *world*')
  })

  it('applies inline code', () => {
    const facets: Facet[] = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{ $type: 'pub.leaflet.richtext.facet#code' }],
      },
    ]
    const { text } = applyFacets('hello', facets)
    assert.equal(text, '`hello`')
  })

  it('applies strikethrough', () => {
    const facets: Facet[] = [
      {
        index: { byteStart: 0, byteEnd: 3 },
        features: [{ $type: 'pub.leaflet.richtext.facet#strikethrough' }],
      },
    ]
    const { text } = applyFacets('bad text', facets)
    assert.equal(text, '~~bad~~ text')
  })

  it('applies link', () => {
    const facets: Facet[] = [
      {
        index: { byteStart: 0, byteEnd: 4 },
        features: [
          { $type: 'pub.leaflet.richtext.facet#link', uri: 'https://example.com' },
        ],
      },
    ]
    const { text } = applyFacets('link text', facets)
    assert.equal(text, '[link](https://example.com) text')
  })

  it('applies footnote — emits reference marker and collects def', () => {
    const facets: Facet[] = [
      {
        index: { byteStart: 6, byteEnd: 10 },
        features: [
          {
            $type: 'pub.leaflet.richtext.facet#footnote',
            footnoteId: 'fn1',
            contentPlaintext: 'This is the note.',
          },
        ],
      },
    ]
    const { text, footnotes } = applyFacets('hello word here', facets)
    assert.equal(text, 'hello word[^1] here')
    assert.equal(footnotes.length, 1)
    assert.equal(footnotes[0]!.content, 'This is the note.')
  })

  it('handles multi-byte UTF-8 characters correctly', () => {
    // "café" — 'é' is 2 bytes (0xC3 0xA9). Bold the 'é' (bytes 3–5).
    const facets: Facet[] = [
      {
        index: { byteStart: 3, byteEnd: 5 },
        features: [{ $type: 'pub.leaflet.richtext.facet#bold' }],
      },
    ]
    const { text } = applyFacets('café', facets)
    assert.equal(text, 'caf**é**')
  })
})

// ─── blockToMarkdown ──────────────────────────────────────────────────────────

describe('blockToMarkdown', () => {
  it('converts a text block', () => {
    const block: TextBlock = {
      $type: 'pub.leaflet.blocks.text',
      plaintext: 'Hello, world.',
    }
    assert.equal(blockToMarkdown(block).markdown, 'Hello, world.')
  })

  it('converts a h1 header', () => {
    const block: HeaderBlock = {
      $type: 'pub.leaflet.blocks.header',
      level: 1,
      plaintext: 'My Title',
    }
    assert.equal(blockToMarkdown(block).markdown, '# My Title')
  })

  it('defaults header level to 1', () => {
    const block: HeaderBlock = {
      $type: 'pub.leaflet.blocks.header',
      plaintext: 'No level',
    }
    assert.equal(blockToMarkdown(block).markdown, '# No level')
  })

  it('converts a code block', () => {
    const block: CodeBlock = {
      $type: 'pub.leaflet.blocks.code',
      plaintext: 'const x = 1',
      language: 'typescript',
    }
    assert.equal(
      blockToMarkdown(block).markdown,
      '```typescript\nconst x = 1\n```',
    )
  })

  it('converts a code block without language', () => {
    const block: CodeBlock = {
      $type: 'pub.leaflet.blocks.code',
      plaintext: 'plain code',
    }
    assert.match(blockToMarkdown(block).markdown, /^```\n/)
  })

  it('converts a blockquote', () => {
    const block: BlockquoteBlock = {
      $type: 'pub.leaflet.blocks.blockquote',
      plaintext: 'To be or not to be.',
    }
    assert.equal(blockToMarkdown(block).markdown, '> To be or not to be.')
  })

  it('converts a horizontal rule', () => {
    assert.equal(
      blockToMarkdown({ $type: 'pub.leaflet.blocks.horizontalRule' }).markdown,
      '---',
    )
  })

  it('converts an ordered list', () => {
    const block: OrderedListBlock = {
      $type: 'pub.leaflet.blocks.orderedList',
      children: [
        { content: { $type: 'pub.leaflet.blocks.text', plaintext: 'First' } },
        { content: { $type: 'pub.leaflet.blocks.text', plaintext: 'Second' } },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '1. First\n2. Second')
  })

  it('respects startIndex on ordered list', () => {
    const block: OrderedListBlock = {
      $type: 'pub.leaflet.blocks.orderedList',
      startIndex: 3,
      children: [
        { content: { $type: 'pub.leaflet.blocks.text', plaintext: 'Item' } },
      ],
    }
    assert.match(blockToMarkdown(block).markdown, /^3\./)
  })

  it('converts an unordered list', () => {
    const block: UnorderedListBlock = {
      $type: 'pub.leaflet.blocks.unorderedList',
      children: [
        { content: { $type: 'pub.leaflet.blocks.text', plaintext: 'Apple' } },
        { content: { $type: 'pub.leaflet.blocks.text', plaintext: 'Banana' } },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '- Apple\n- Banana')
  })

  it('converts nested unordered list', () => {
    const block: UnorderedListBlock = {
      $type: 'pub.leaflet.blocks.unorderedList',
      children: [
        {
          content: { $type: 'pub.leaflet.blocks.text', plaintext: 'Parent' },
          children: [
            {
              content: { $type: 'pub.leaflet.blocks.text', plaintext: 'Child' },
            },
          ],
        },
      ],
    }
    const md = blockToMarkdown(block).markdown
    assert.match(md, /^- Parent\n {2}- Child$/)
  })

  it('emits a comment for unsupported block types', () => {
    const block = { $type: 'pub.leaflet.blocks.poll' } as never
    assert.match(blockToMarkdown(block).markdown, /<!--.*Unsupported.*poll/)
  })
})

// ─── contentToMarkdown ────────────────────────────────────────────────────────

describe('contentToMarkdown', () => {
  it('converts a single-page linear document', () => {
    const content: LeafletContent = {
      $type: 'pub.leaflet.content',
      pages: [
        {
          $type: 'pub.leaflet.pages.linearDocument',
          blocks: [
            {
              block: {
                $type: 'pub.leaflet.blocks.header',
                level: 1,
                plaintext: 'Hello',
              },
            },
            {
              block: { $type: 'pub.leaflet.blocks.text', plaintext: 'World' },
            },
          ],
        },
      ],
    }
    const md = contentToMarkdown(content)
    assert.match(md, /^# Hello/)
    assert.match(md, /World/)
  })

  it('joins pages with the default separator', () => {
    const content: LeafletContent = {
      $type: 'pub.leaflet.content',
      pages: [
        {
          $type: 'pub.leaflet.pages.linearDocument',
          blocks: [
            { block: { $type: 'pub.leaflet.blocks.text', plaintext: 'Page 1' } },
          ],
        },
        {
          $type: 'pub.leaflet.pages.linearDocument',
          blocks: [
            { block: { $type: 'pub.leaflet.blocks.text', plaintext: 'Page 2' } },
          ],
        },
      ],
    }
    const md = contentToMarkdown(content)
    assert.match(md, /Page 1/)
    assert.match(md, /---/)
    assert.match(md, /Page 2/)
  })

  it('emits canvas page comment', () => {
    const content: LeafletContent = {
      $type: 'pub.leaflet.content',
      pages: [{ $type: 'pub.leaflet.pages.canvas' }],
    }
    const md = contentToMarkdown(content)
    assert.match(md, /Canvas page/)
  })

  it('respects a custom pageBreak option', () => {
    const content: LeafletContent = {
      $type: 'pub.leaflet.content',
      pages: [
        {
          $type: 'pub.leaflet.pages.linearDocument',
          blocks: [{ block: { $type: 'pub.leaflet.blocks.text', plaintext: 'A' } }],
        },
        {
          $type: 'pub.leaflet.pages.linearDocument',
          blocks: [{ block: { $type: 'pub.leaflet.blocks.text', plaintext: 'B' } }],
        },
      ],
    }
    const md = contentToMarkdown(content, { pageBreak: '\n<!-- page -->\n' })
    assert.match(md, /<!-- page -->/)
  })
})

// ─── documentToMarkdown ───────────────────────────────────────────────────────

describe('documentToMarkdown', () => {
  const baseDoc: StandardDocument = {
    title: 'Test Post',
    site: 'https://ewancroft.uk',
    publishedAt: '2025-03-01T12:00:00Z',
    content: {
      $type: 'pub.leaflet.content',
      pages: [
        {
          $type: 'pub.leaflet.pages.linearDocument',
          blocks: [
            { block: { $type: 'pub.leaflet.blocks.text', plaintext: 'Body text.' } },
          ],
        },
      ],
    },
  }

  it('converts body without front matter by default', () => {
    const md = documentToMarkdown(baseDoc)
    assert.doesNotMatch(md, /^---/)
    assert.match(md, /Body text\./)
  })

  it('emits YAML front matter when requested', () => {
    const md = documentToMarkdown(baseDoc, { frontmatter: true })
    assert.match(md, /^---\n/)
    assert.match(md, /title: Test Post/)
    assert.match(md, /publishedAt: 2025-03-01T12:00:00Z/)
    assert.match(md, /---\n/)
    assert.match(md, /Body text\./)
  })

  it('includes tags in front matter', () => {
    const doc: StandardDocument = {
      ...baseDoc,
      tags: ['atproto', 'leaflet'],
    }
    const md = documentToMarkdown(doc, { frontmatter: true })
    assert.match(md, /tags:/)
    assert.match(md, /- atproto/)
    assert.match(md, /- leaflet/)
  })

  it('falls back to textContent when content is absent', () => {
    const doc: StandardDocument = {
      title: 'No content',
      site: 'https://example.com',
      publishedAt: '2025-01-01T00:00:00Z',
      textContent: 'Fallback text.',
    }
    const md = documentToMarkdown(doc)
    assert.match(md, /Fallback text\./)
  })
})
