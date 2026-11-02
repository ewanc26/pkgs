/**
 * @ewanc26/rock-tumbl — Convert Tumblr blog exports into Standard.site documents.
 *
 * Public API:
 *   detectLayout(input)          — detect Tumblr export layout (ZIP or directory)
 *   parseArchive(input)          — parse posts from an archive
 *   convertArchive(posts)        — convert posts to site.standard.document values
 *   uploadArchiveMedia(...)      — upload local media and get blob URLs
 *   StandardSitePublisher        — create publications and publish documents
 *
 * See README.md for usage and the CLI (`rock-tumbl --help`).
 */

export const name = 'rock-tumbl'

export {
  detectLayout,
  parseArchive,
  parseExportTimestamp,
  type DetectResult,
} from './archive.js'

export {
  convertArchive,
  validateDocument,
  validateSite,
} from './convert.js'

export type {
  ConvertOptions,
  ConvertResult,
  ImportError,
  StandardDocumentValue,
} from './types.js'

export {
  sanitizeHtml,
  htmlToMarkdown,
  htmlToText,
} from './sanitize.js'

export {
  isAtUri,
  isPublicationAtUri,
  parseAtUri,
  type AtUriParts,
} from './aturi.js'

export {
  buildPublicationValue,
  normalizePublicationUrl,
  publicationWellKnownBody,
  publicationWellKnownPath,
  PUBLICATION_COLLECTION,
  type PublicationInput,
} from './publication.js'

export {
  DEFAULT_MAX_BLOB_BYTES,
  openMediaArchive,
  rewriteMediaReferences,
  uploadArchiveMedia,
  type BlobUploader,
  type MediaArchive,
  type MediaUploadOptions,
  type MediaUploadResult,
} from './media.js'

export {
  StandardSitePublisher,
  type PublishResult,
  type PublisherConfig,
  type PublishProgress,
} from './publisher.js'

export type {
  ArchiveLayout,
  AtProtoBlobRef,
  ParsedArchive,
  StandardPublicationValue,
  TumblrMedia,
  TumblrPost,
  TumblrPostType,
  PublishOptions,
} from './types.js'
