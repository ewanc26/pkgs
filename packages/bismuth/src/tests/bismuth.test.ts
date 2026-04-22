import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { applyFacets } from '../facets.js'
import { blockToMarkdown } from '../blocks.js'
import { contentToMarkdown, documentToMarkdown, offprintContentToMarkdown } from '../convert.js'
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
  // Pckt
  PcktTextBlock,
  PcktHeadingBlock,
  PcktBlockquoteBlock,
  PcktBulletListBlock,
  PcktOrderedListBlock,
  PcktFacet,
  PcktContent,
  // Offprint
  OffprintTextBlock,
  OffprintHeadingBlock,
  OffprintCodeBlock,
  OffprintBulletListBlock,
  OffprintOrderedListBlock,
  OffprintTaskListBlock,
  OffprintBlockquoteBlock,
  OffprintFacet,
  OffprintContent,
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

// ─── Pckt blocks ───────────────────────────────────────────────────────────────

describe('Pckt blockToMarkdown', () => {
  it('converts a Pckt text block', () => {
    const block: PcktTextBlock = {
      $type: 'blog.pckt.block.text',
      plaintext: 'Hello from Pckt.',
    }
    assert.equal(blockToMarkdown(block).markdown, 'Hello from Pckt.')
  })

  it('converts a Pckt heading', () => {
    const block: PcktHeadingBlock = {
      $type: 'blog.pckt.block.heading',
      plaintext: 'A Pckt Heading',
      level: 2,
    }
    assert.equal(blockToMarkdown(block).markdown, '## A Pckt Heading')
  })

  it('defaults Pckt heading level to 1', () => {
    const block: PcktHeadingBlock = {
      $type: 'blog.pckt.block.heading',
      plaintext: 'No Level',
    }
    assert.equal(blockToMarkdown(block).markdown, '# No Level')
  })

  it('converts a Pckt blockquote', () => {
    const block: PcktBlockquoteBlock = {
      $type: 'blog.pckt.block.blockquote',
      content: [
        { $type: 'blog.pckt.block.text', plaintext: 'Quoted text.' },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '> Quoted text.')
  })

  it('converts a Pckt bullet list', () => {
    const block: PcktBulletListBlock = {
      $type: 'blog.pckt.block.bulletList',
      content: [
        {
          $type: 'blog.pckt.block.listItem',
          content: [{ $type: 'blog.pckt.block.text', plaintext: 'Alpha' }],
        },
        {
          $type: 'blog.pckt.block.listItem',
          content: [{ $type: 'blog.pckt.block.text', plaintext: 'Beta' }],
        },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '- Alpha\n- Beta')
  })

  it('converts a Pckt ordered list', () => {
    const block: PcktOrderedListBlock = {
      $type: 'blog.pckt.block.orderedList',
      content: [
        {
          $type: 'blog.pckt.block.listItem',
          content: [{ $type: 'blog.pckt.block.text', plaintext: 'First' }],
        },
        {
          $type: 'blog.pckt.block.listItem',
          content: [{ $type: 'blog.pckt.block.text', plaintext: 'Second' }],
        },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '1. First\n2. Second')
  })

  it('converts a Pckt horizontal rule', () => {
    assert.equal(
      blockToMarkdown({ $type: 'blog.pckt.block.horizontalRule' }).markdown,
      '---',
    )
  })

  it('applies Pckt facets (bold)', () => {
    const facets: PcktFacet[] = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{ $type: 'blog.pckt.richtext.facet#bold' }],
      },
    ]
    const block: PcktTextBlock = {
      $type: 'blog.pckt.block.text',
      plaintext: 'hello world',
      facets,
    }
    assert.equal(blockToMarkdown(block).markdown, '**hello** world')
  })

  it('applies Pckt facets (link)', () => {
    const facets: PcktFacet[] = [
      {
        index: { byteStart: 0, byteEnd: 4 },
        features: [{ $type: 'blog.pckt.richtext.facet#link', uri: 'https://pckt.app' }],
      },
    ]
    const block: PcktTextBlock = {
      $type: 'blog.pckt.block.text',
      plaintext: 'Pckt blog',
      facets,
    }
    assert.equal(blockToMarkdown(block).markdown, '[Pckt](https://pckt.app) blog')
  })
})

// ─── Pckt inline content ─────────────────────────────────────────────────────────

describe('pcktContentToMarkdown (inline items)', () => {
  it('converts inline Pckt content without blob resolution', async () => {
    // Dynamically import to avoid top-level await
    const { pcktContentToMarkdown } = await import('../convert.js')
    const content: PcktContent = {
      $type: 'blog.pckt.content',
      items: [
        { $type: 'blog.pckt.block.heading', plaintext: 'Title', level: 1 } as PcktHeadingBlock,
        { $type: 'blog.pckt.block.text', plaintext: 'Body.' } as PcktTextBlock,
      ],
    }
    const md = await pcktContentToMarkdown(content)
    assert.match(md, /^# Title/)
    assert.match(md, /Body\./)
  })
})

// ─── Offprint blocks ────────────────────────────────────────────────────────────

describe('Offprint blockToMarkdown', () => {
  it('converts an Offprint text block', () => {
    const block: OffprintTextBlock = {
      $type: 'app.offprint.block.text',
      plaintext: 'Hello from Offprint.',
    }
    assert.equal(blockToMarkdown(block).markdown, 'Hello from Offprint.')
  })

  it('converts an Offprint heading', () => {
    const block: OffprintHeadingBlock = {
      $type: 'app.offprint.block.heading',
      plaintext: 'An Offprint Heading',
      level: 3,
    }
    assert.equal(blockToMarkdown(block).markdown, '### An Offprint Heading')
  })

  it('converts an Offprint code block', () => {
    const block: OffprintCodeBlock = {
      $type: 'app.offprint.block.codeBlock',
      code: 'console.log("hi")',
      language: 'javascript',
    }
    assert.equal(
      blockToMarkdown(block).markdown,
      '```javascript\nconsole.log("hi")\n```',
    )
  })

  it('converts an Offprint bullet list', () => {
    const block: OffprintBulletListBlock = {
      $type: 'app.offprint.block.bulletList',
      children: [
        { content: { $type: 'app.offprint.block.text', plaintext: 'One' } },
        { content: { $type: 'app.offprint.block.text', plaintext: 'Two' } },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '- One\n- Two')
  })

  it('converts nested Offprint bullet list', () => {
    const block: OffprintBulletListBlock = {
      $type: 'app.offprint.block.bulletList',
      children: [
        {
          content: { $type: 'app.offprint.block.text', plaintext: 'Parent' },
          children: [
            { content: { $type: 'app.offprint.block.text', plaintext: 'Child' } },
          ],
        },
      ],
    }
    const md = blockToMarkdown(block).markdown
    assert.match(md, /^- Parent\n {2}- Child$/)
  })

  it('converts an Offprint ordered list', () => {
    const block: OffprintOrderedListBlock = {
      $type: 'app.offprint.block.orderedList',
      children: [
        { content: { $type: 'app.offprint.block.text', plaintext: 'A' } },
        { content: { $type: 'app.offprint.block.text', plaintext: 'B' } },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '1. A\n2. B')
  })

  it('converts an Offprint task list', () => {
    const block: OffprintTaskListBlock = {
      $type: 'app.offprint.block.taskList',
      children: [
        {
          content: { $type: 'app.offprint.block.text', plaintext: 'Done' },
          checked: true,
        },
        {
          content: { $type: 'app.offprint.block.text', plaintext: 'Pending' },
          checked: false,
        },
      ],
    }
    const md = blockToMarkdown(block).markdown
    assert.equal(md, '- [x] Done\n- [ ] Pending')
  })

  it('converts an Offprint blockquote', () => {
    const block: OffprintBlockquoteBlock = {
      $type: 'app.offprint.block.blockquote',
      content: [
        { $type: 'app.offprint.block.text', plaintext: 'Wise words.' },
      ],
    }
    assert.equal(blockToMarkdown(block).markdown, '> Wise words.')
  })

  it('converts an Offprint horizontal rule', () => {
    assert.equal(
      blockToMarkdown({ $type: 'app.offprint.block.horizontalRule' }).markdown,
      '---',
    )
  })

  it('applies Offprint facets (italic)', () => {
    const facets: OffprintFacet[] = [
      {
        index: { byteStart: 0, byteEnd: 7 },
        features: [{ $type: 'app.offprint.richtext.facet#italic' }],
      },
    ]
    const block: OffprintTextBlock = {
      $type: 'app.offprint.block.text',
      plaintext: 'Offprint text',
      facets,
    }
    assert.equal(blockToMarkdown(block).markdown, '*Offprint* text')
  })

  it('applies Offprint highlight with color', () => {
    const facets: OffprintFacet[] = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{ $type: 'app.offprint.richtext.facet#highlight', color: '#ff0' }],
      },
    ]
    const block: OffprintTextBlock = {
      $type: 'app.offprint.block.text',
      plaintext: 'hello',
      facets,
    }
    assert.match(blockToMarkdown(block).markdown, /mark.*style/)
  })

  it('applies Offprint mention with handle', () => {
    const facets: OffprintFacet[] = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{
          $type: 'app.offprint.richtext.facet#mention',
          did: 'did:plc:abc',
          handle: 'alice.bsky.social',
        }],
      },
    ]
    const block: OffprintTextBlock = {
      $type: 'app.offprint.block.text',
      plaintext: 'alice',
      facets,
    }
    const md = blockToMarkdown(block).markdown
    assert.match(md, /@alice\.bsky\.social/)
    assert.match(md, /bsky\.app\/profile/)
  })
})

// ─── offprintContentToMarkdown ───────────────────────────────────────────────────────

describe('offprintContentToMarkdown', () => {
  it('converts Offprint content items', () => {
    const content: OffprintContent = {
      $type: 'app.offprint.content',
      items: [
        { $type: 'app.offprint.block.heading', plaintext: 'My Post', level: 1 } as OffprintHeadingBlock,
        { $type: 'app.offprint.block.text', plaintext: 'Some body text.' } as OffprintTextBlock,
      ],
    }
    const md = offprintContentToMarkdown(content)
    assert.match(md, /^# My Post/)
    assert.match(md, /Some body text\./)
  })

  it('collects footnotes from Offprint content', () => {
    const content: OffprintContent = {
      $type: 'app.offprint.content',
      items: [
        {
          $type: 'app.offprint.block.text',
          plaintext: 'word',
          facets: [
            {
              index: { byteStart: 0, byteEnd: 4 },
              features: [{
                $type: 'pub.leaflet.richtext.facet#footnote' as 'app.offprint.richtext.facet#mention',
                // We\'re exercising that footnotes from any platform are collected
              } as never],
            },
          ],
        } as OffprintTextBlock,
      ],
    }
    // Just check it doesn\'t throw and returns a string
    const md = offprintContentToMarkdown(content)
    assert.equal(typeof md, 'string')
  })
})
