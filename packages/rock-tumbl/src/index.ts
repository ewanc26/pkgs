/**
 * @ewanc26/rock-tumbl — Convert Tumblr blog exports into Standard.site documents.
 *
 * Public API:
 *   detectLayout(input)      — detect Tumblr export layout (ZIP or directory)
 *   parseArchive(input)      — parse posts from an archive
 *   convertArchive(posts)    — convert posts to site.standard.document values
 *   publish(doc)             — publish documents via StandardSitePublisher
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
  StandardSitePublisher,
  type PublishResult,
  type PublisherConfig,
  type PublishProgress,
} from './publisher.js'

export type {
  ArchiveLayout,
  ParsedArchive,
  TumblrMedia,
  TumblrPost,
  TumblrPostType,
  PublishOptions,
} from './types.js'
