/**
 * TypeScript types mirroring the pub.leaflet.* and site.standard.* lexicons.
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

// ─── Block union ─────────────────────────────────────────────────────────────

export type AnyBlock =
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
