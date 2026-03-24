/**
 * @ewanc26/bismuth
 *
 * Convert pub.leaflet RTF-block documents (as used in site.standard.document
 * records) to Markdown.
 */

// Library surface
export { contentToMarkdown, documentToMarkdown } from './convert.js'
export { blockToMarkdown } from './blocks.js'
export { applyFacets } from './facets.js'

// Types
export type {
  ConvertOptions,
} from './convert.js'
export type {
  BlockResult,
} from './blocks.js'
export type {
  ApplyFacetsResult,
  FootnoteDef,
} from './facets.js'
export type {
  // Document types
  StandardDocument,
  LeafletContent,
  Page,
  LinearDocumentPage,
  CanvasPage,
  // Block types
  AnyBlock,
  TextBlock,
  HeaderBlock,
  BlockquoteBlock,
  CodeBlock,
  HorizontalRuleBlock,
  ImageBlock,
  MathBlock,
  ButtonBlock,
  BskyPostBlock,
  IframeBlock,
  WebsiteBlock,
  OrderedListBlock,
  UnorderedListBlock,
  ListItem,
  ListItemContent,
  // Facet types
  Facet,
  FacetFeature,
  ByteSlice,
} from './types.js'
