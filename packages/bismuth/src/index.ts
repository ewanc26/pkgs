/**
 * @ewanc26/bismuth
 *
 * Convert ATProto richtext-block documents (pub.leaflet, blog.pckt, app.offprint)
 * as used in site.standard.document records, to Markdown.
 */

// Library surface
export { contentToMarkdown, documentToMarkdown, pcktContentToMarkdown, offprintContentToMarkdown } from './convert.js'
export { blockToMarkdown } from './blocks.js'
export { applyFacets } from './facets.js'
export { resolvePcktContent, createPdsBlobResolver } from './blob.js'

// Types
export type {
  ConvertOptions,
  PcktConvertOptions,
} from './convert.js'
export type {
  BlockResult,
} from './blocks.js'
export type {
  ApplyFacetsResult,
  FootnoteDef,
} from './facets.js'
export type {
  BlobResolver,
} from './blob.js'
export type {
  // Shared
  BlobRef,
  StrongRef,
  // Document types
  StandardDocument,
  LeafletContent,
  Page,
  LinearDocumentPage,
  CanvasPage,
  // Leaflet block types
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
  PageLinkBlock,
  PollBlock,
  // Leaflet facet types
  Facet,
  FacetFeature,
  ByteSlice,
  // Pckt content
  PcktContent,
  // Pckt block types
  PcktTextBlock,
  PcktHeadingBlock,
  PcktImageBlock,
  PcktBlockquoteBlock,
  PcktBulletListBlock,
  PcktOrderedListBlock,
  PcktListItem,
  PcktHorizontalRuleBlock,
  // Pckt facet types
  PcktFacet,
  PcktFacetFeature,
  // Offprint content
  OffprintContent,
  // Offprint block types
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
  OffprintHorizontalRuleBlock,
  OffprintWebEmbedBlock,
  OffprintBlueskyPostBlock,
  // Offprint facet types
  OffprintFacet,
  OffprintFacetFeature,
} from './types.js'
