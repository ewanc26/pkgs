/**
 * TypeScript types mirroring the pub.leaflet.*, blog.pckt.*, and app.offprint.* lexicons.
 * Only the fields relevant for Markdown conversion are represented.
 */

// ─── Facets ──────────────────────────────────────────────────────────────────

export interface ByteSlice {
  byteStart: number
  byteEnd: number
}

export type FacetFeature =
  | { $type: 'pub.leaflet.richtext.facet#link'; uri: string }
  | { $type: 'pub.leaflet.richtext.facet#bold' }
  | { $type: 'pub.leaflet.richtext.facet#italic' }
  | { $type: 'pub.leaflet.richtext.facet#code' }
  | { $type: 'pub.leaflet.richtext.facet#strikethrough' }
  | { $type: 'pub.leaflet.richtext.facet#underline' }
  | { $type: 'pub.leaflet.richtext.facet#highlight' }
  | {
      $type: 'pub.leaflet.richtext.facet#footnote'
      footnoteId: string
      contentPlaintext: string
      contentFacets?: Facet[]
    }
  | { $type: 'pub.leaflet.richtext.facet#didMention'; did: string }
  | { $type: 'pub.leaflet.richtext.facet#atMention'; atURI: string }
  | { $type: 'pub.leaflet.richtext.facet#id'; id?: string }

export interface Facet {
  index: ByteSlice
  features: FacetFeature[]
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

export interface TextBlock {
  $type: 'pub.leaflet.blocks.text'
  plaintext: string
  textSize?: 'default' | 'small' | 'large'
  facets?: Facet[]
}

export interface HeaderBlock {
  $type: 'pub.leaflet.blocks.header'
  level?: number
  plaintext: string
  facets?: Facet[]
}

export interface BlockquoteBlock {
  $type: 'pub.leaflet.blocks.blockquote'
  plaintext: string
  facets?: Facet[]
}

export interface CodeBlock {
  $type: 'pub.leaflet.blocks.code'
  plaintext: string
  language?: string
  syntaxHighlightingTheme?: string
}

export interface HorizontalRuleBlock {
  $type: 'pub.leaflet.blocks.horizontalRule'
}

export interface ImageBlock {
  $type: 'pub.leaflet.blocks.image'
  image: unknown // blob ref — not resolvable without ATProto context
  alt?: string
  aspectRatio: { width: number; height: number }
}

export interface MathBlock {
  $type: 'pub.leaflet.blocks.math'
  latex: string
}

export interface ButtonBlock {
  $type: 'pub.leaflet.blocks.button'
  text: string
  url?: string
}

export interface BskyPostBlock {
  $type: 'pub.leaflet.blocks.bskyPost'
  uri?: string
  did?: string
}

export interface IframeBlock {
  $type: 'pub.leaflet.blocks.iframe'
  url: string
  aspectRatio?: { width: number; height: number }
}

export interface WebsiteBlock {
  $type: 'pub.leaflet.blocks.website'
  url: string
  title?: string
  description?: string
}

export interface PageLinkBlock {
  $type: 'pub.leaflet.blocks.page'
  pageId?: string
}

export interface PollBlock {
  $type: 'pub.leaflet.blocks.poll'
}

// ─── Lists ───────────────────────────────────────────────────────────────────

export type ListItemContent = TextBlock | HeaderBlock | ImageBlock

export interface ListItem {
  content: ListItemContent
  children?: ListItem[]
  orderedListChildren?: OrderedListBlock
  unorderedListChildren?: UnorderedListBlock
}

export interface OrderedListBlock {
  $type: 'pub.leaflet.blocks.orderedList'
  startIndex?: number
  children: ListItem[]
}

export interface UnorderedListBlock {
  $type: 'pub.leaflet.blocks.unorderedList'
  children: ListItem[]
}

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface BlobRef {
  $type: 'blob'
  mimeType: string
  size: number
  ref?: { $type: 'blobRef'; mimeType: string; size: number; cid: string }
  cid?: string
}

export interface StrongRef {
  uri: string
  cid: string
}

// ─── Pckt Facets ─────────────────────────────────────────────────────────────

export type PcktFacetFeature =
  | { $type: 'blog.pckt.richtext.facet#link'; uri: string }
  | { $type: 'blog.pckt.richtext.facet#bold' }
  | { $type: 'blog.pckt.richtext.facet#italic' }
  | { $type: 'blog.pckt.richtext.facet#code' }
  | { $type: 'blog.pckt.richtext.facet#strikethrough' }
  | { $type: 'blog.pckt.richtext.facet#underline' }
  | { $type: 'blog.pckt.richtext.facet#highlight' }
  | { $type: 'blog.pckt.richtext.facet#didMention'; did: string }
  | { $type: 'blog.pckt.richtext.facet#atMention'; atURI: string }
  | { $type: 'blog.pckt.richtext.facet#id'; id?: string }

export interface PcktFacet {
  index: ByteSlice
  features: PcktFacetFeature[]
}

// ─── Pckt Blocks ─────────────────────────────────────────────────────────────

export interface PcktTextBlock {
  $type: 'blog.pckt.block.text'
  plaintext: string
  facets?: PcktFacet[]
}

export interface PcktHeadingBlock {
  $type: 'blog.pckt.block.heading'
  plaintext: string
  level?: number
  facets?: PcktFacet[]
}

export interface PcktImageBlock {
  $type: 'blog.pckt.block.image'
  attrs: {
    src: string
    alt?: string
    blob?: BlobRef
    aspectRatio?: { width: number; height: number }
    title?: string
    align?: 'left' | 'center' | 'right'
  }
}

export interface PcktBlockquoteBlock {
  $type: 'blog.pckt.block.blockquote'
  content: PcktTextBlock[]
}

export interface PcktBulletListBlock {
  $type: 'blog.pckt.block.bulletList'
  content: PcktListItem[]
}

export interface PcktOrderedListBlock {
  $type: 'blog.pckt.block.orderedList'
  content: PcktListItem[]
  start?: number
}

export interface PcktListItem {
  $type: 'blog.pckt.block.listItem'
  content: (PcktTextBlock | PcktBulletListBlock | PcktOrderedListBlock)[]
}

export interface PcktHorizontalRuleBlock {
  $type: 'blog.pckt.block.horizontalRule'
}

// ─── Pckt Content ────────────────────────────────────────────────────────────

export interface PcktContent {
  $type: 'blog.pckt.content'
  items?: AnyBlock[]
  blob?: BlobRef
  references?: BlobRef[]
}

// ─── Offprint Facets ─────────────────────────────────────────────────────────

export type OffprintFacetFeature =
  | { $type: 'app.offprint.richtext.facet#link'; uri: string }
  | { $type: 'app.offprint.richtext.facet#bold' }
  | { $type: 'app.offprint.richtext.facet#italic' }
  | { $type: 'app.offprint.richtext.facet#code' }
  | { $type: 'app.offprint.richtext.facet#strikethrough' }
  | { $type: 'app.offprint.richtext.facet#underline' }
  | { $type: 'app.offprint.richtext.facet#highlight'; color?: string }
  | { $type: 'app.offprint.richtext.facet#mention'; did: string; handle?: string }
  | { $type: 'app.offprint.richtext.facet#webMention'; uri: string; title: string; siteName?: string }

export interface OffprintFacet {
  index: ByteSlice
  features: OffprintFacetFeature[]
}

// ─── Offprint Blocks ─────────────────────────────────────────────────────────

export interface OffprintTextBlock {
  $type: 'app.offprint.block.text'
  plaintext: string
  facets?: OffprintFacet[]
  textAlign?: 'left' | 'center' | 'right' | 'justify'
}

export interface OffprintHeadingBlock {
  $type: 'app.offprint.block.heading'
  plaintext: string
  level: number
  facets?: OffprintFacet[]
  textAlign?: 'left' | 'center' | 'right'
}

export interface OffprintImageBlock {
  $type: 'app.offprint.block.image'
  blob?: BlobRef
  alt?: string
  caption?: string
  captionFacets?: OffprintFacet[]
  aspectRatio?: { width: number; height: number }
  alignment?: 'left' | 'center' | 'right'
  width?: string
}

export interface OffprintBlockquoteBlock {
  $type: 'app.offprint.block.blockquote'
  content: (OffprintTextBlock | OffprintHeadingBlock)[]
}

export interface OffprintBulletListBlock {
  $type: 'app.offprint.block.bulletList'
  children: OffprintListItem[]
}

export interface OffprintOrderedListBlock {
  $type: 'app.offprint.block.orderedList'
  children: OffprintListItem[]
  start?: number
}

export interface OffprintListItem {
  content: OffprintTextBlock
  children?: OffprintListItem[]
}

export interface OffprintTaskListBlock {
  $type: 'app.offprint.block.taskList'
  children: OffprintTaskItem[]
}

export interface OffprintTaskItem {
  content: OffprintTextBlock
  checked: boolean
  children?: OffprintTaskItem[]
}

export interface OffprintCodeBlock {
  $type: 'app.offprint.block.codeBlock'
  code: string
  language?: string
  showLineNumbers?: boolean
}

export interface OffprintHorizontalRuleBlock {
  $type: 'app.offprint.block.horizontalRule'
}

export interface OffprintWebEmbedBlock {
  $type: 'app.offprint.block.webEmbed'
  href: string
  title?: string
  description?: string
  siteName?: string
  embedUrl?: string
  preview?: BlobRef
}

export interface OffprintBlueskyPostBlock {
  $type: 'app.offprint.block.blueskyPost'
  post: StrongRef
}

// ─── Offprint Content ────────────────────────────────────────────────────────

export interface OffprintContent {
  $type: 'app.offprint.content'
  items: AnyBlock[]
}

// ─── Block union ─────────────────────────────────────────────────────────────

export type AnyBlock =
  // Leaflet
  | TextBlock
  | HeaderBlock
  | BlockquoteBlock
  | CodeBlock
  | HorizontalRuleBlock
  | ImageBlock
  | MathBlock
  | ButtonBlock
  | BskyPostBlock
  | IframeBlock
  | WebsiteBlock
  | OrderedListBlock
  | UnorderedListBlock
  | PageLinkBlock
  | PollBlock
  // Pckt
  | PcktTextBlock
  | PcktHeadingBlock
  | PcktImageBlock
  | PcktBlockquoteBlock
  | PcktBulletListBlock
  | PcktOrderedListBlock
  | PcktHorizontalRuleBlock
  // Offprint
  | OffprintTextBlock
  | OffprintHeadingBlock
  | OffprintImageBlock
  | OffprintBlockquoteBlock
  | OffprintBulletListBlock
  | OffprintOrderedListBlock
  | OffprintTaskListBlock
  | OffprintCodeBlock
  | OffprintHorizontalRuleBlock
  | OffprintWebEmbedBlock
  | OffprintBlueskyPostBlock

// ─── Pages ───────────────────────────────────────────────────────────────────

export interface LinearDocumentPage {
  $type: 'pub.leaflet.pages.linearDocument'
  id?: string
  blocks: Array<{
    block: AnyBlock
    alignment?: string
  }>
}

export interface CanvasPage {
  $type: 'pub.leaflet.pages.canvas'
}

export type Page = LinearDocumentPage | CanvasPage

// ─── Content / Document ──────────────────────────────────────────────────────

export interface LeafletContent {
  $type: 'pub.leaflet.content'
  pages: Page[]
}

export interface StandardDocument {
  $type?: 'site.standard.document'
  title: string
  site: string
  publishedAt: string
  updatedAt?: string
  description?: string
  tags?: string[]
  textContent?: string
  content?: LeafletContent
  path?: string
}
