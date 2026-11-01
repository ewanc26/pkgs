/**
 * Shared types for @ewanc26/rock-tumbl.
 *
 * TumblrPost is the normalised intermediate format — the archive parser
 * produces these from documented Tumblr export layouts. The converter then
 * turns TumblrPost[] into site.standard.document values ready for publishing.
 */

// ─── Tumblr post types ──────────────────────────────────────────────────────

export type TumblrPostType =
  | 'text'
  | 'photo'
  | 'quote'
  | 'link'
  | 'chat'
  | 'audio'
  | 'video'
  | 'answer'
  | 'unknown'

// ─── Media attachment ───────────────────────────────────────────────────────

export interface TumblrMedia {
  type: 'photo' | 'video' | 'audio'
  /** Original Tumblr-hosted URL (not yet migrated into the destination) */
  url: string
  /** Local path within the extracted archive, if present */
  localPath?: string
  altText?: string
  mimeType?: string
  size?: number
  width?: number
  height?: number
}

// ─── Normalised Tumblr post ─────────────────────────────────────────────────

export interface TumblrPost {
  /** Tumblr post id (string, as exported) */
  id: string
  /** Canonical Tumblr post URL (provenance) */
  postUrl?: string
  /** Tumblr blog name (e.g. "myblog") */
  blogName?: string
  /** Blog URL (e.g. https://myblog.tumblr.com) */
  blogUrl?: string
  type: TumblrPostType
  title?: string
  /** Post body HTML (may be undefined for link/quote/etc. posts) */
  body?: string
  /** Plain-text excerpt where available */
  summary?: string
  tags: string[]
  /** ISO 8601 timestamp of the original post */
  date: string
  /** Unix seconds, when the export provides it */
  timestamp?: number
  media: TumblrMedia[]
  /** Linked source for link posts */
  sourceUrl?: string
  sourceTitle?: string
  /** Reblog trail (for quote/reblog context) */
  trail?: string[]
  isPrivate?: boolean
  isDraft?: boolean
  slug?: string
  /** Raw export entry this post was read from (for diagnostics) */
  sourceFile?: string
}

// ─── Archive detection / parsing ────────────────────────────────────────────

export type ArchiveLayout = 'unknown' | 'posts-xml' | 'posts-html' | 'directory'

export interface ParsedArchive {
  layout: ArchiveLayout
  blogName?: string
  posts: TumblrPost[]
  /** Non-fatal warnings encountered while parsing */
  warnings: string[]
}

// ─── Import errors / results ────────────────────────────────────────────────

export interface ImportError {
  postId?: string
  sourceFile?: string
  type: 'parse' | 'convert' | 'publish' | 'validation'
  message: string
}

export interface ConvertResult {
  /** Converted site.standard.document values */
  documents: StandardDocumentValue[]
  skipped: number
  errors: ImportError[]
  warnings: string[]
}

// ─── Standard.site document value ───────────────────────────────────────────

/**
 * The record value shape for site.standard.document.
 * content uses the site.standard.content.markdown format (see convert.ts).
 */
export interface StandardDocumentValue {
  $type: 'site.standard.document'
  site: string
  title: string
  publishedAt: string
  path?: string
  description?: string
  updatedAt?: string
  tags?: string[]
  textContent?: string
  content?: {
    $type: 'site.standard.content.markdown'
    text: string
    version: '1.0'
  }
  bskyPostRef?: unknown
  coverImage?: unknown
  preferences?: unknown
}

// ─── Conversion / publish options ───────────────────────────────────────────

export interface ConvertOptions {
  /** Source publication/site URL used as the document `site` field */
  site: string
  /** Default path prefix for document paths (e.g. "/posts/") */
  pathPrefix?: string
  /** Include private/draft posts (default: false) */
  includePrivate?: boolean
}

export interface PublishOptions {
  handle: string
  password: string
  service?: string
  dryRun?: boolean
}

export interface PublishSummary {
  published: number
  failed: number
  skipped: number
  errors: ImportError[]
}
