/**
 * Convert TumblrPost[] into site.standard.document values.
 *
 * Content is produced in the site.standard.content.markdown format:
 * { $type: 'site.standard.content.markdown', text: markdown, version: '1.0' }
 *
 * This is a documented, reader-friendly choice; Standard.site's `content`
 * field is an open union so each reader decides which formats it renders.
 * The original Tumblr post URL is preserved as provenance in the document
 * description, and the post id is used to build a stable document path.
 */

import type {
  ConvertOptions,
  ConvertResult,
  ImportError,
  StandardDocumentValue,
  TumblrPost,
} from './types.js'
import { isPublicationAtUri } from './aturi.js'
import { htmlToMarkdown, htmlToText, sanitizeHtml } from './sanitize.js'

// ─── Conversion ─────────────────────────────────────────────────────────────

export function convertArchive(
  posts: TumblrPost[],
  options: ConvertOptions,
): ConvertResult {
  const { site, pathPrefix = '/posts/', includePrivate = false } = options
  const documents: StandardDocumentValue[] = []
  const errors: ImportError[] = []
  const warnings: string[] = []
  let skipped = 0

  const seenPaths = new Set<string>()

  for (const post of posts) {
    if (!includePrivate && (post.isPrivate || post.isDraft)) {
      skipped++
      continue
    }

    try {
      const doc = postToDocument(post, site, pathPrefix, seenPaths, warnings)
      documents.push(doc)
    } catch (err) {
      errors.push({
        postId: post.id,
        sourceFile: post.sourceFile,
        type: 'convert',
        message: String(err),
      })
      skipped++
    }
  }

  return { documents, skipped, errors, warnings }
}

function postToDocument(
  post: TumblrPost,
  site: string,
  pathPrefix: string,
  seenPaths: Set<string>,
  warnings: string[],
): StandardDocumentValue {
  const title = post.title ?? post.postUrl ?? `Tumblr post ${post.id}`
  const publishedAt = post.date

  const body = post.body ?? ''
  const safeHtml = sanitizeHtml(body)
  const markdown = (htmlToMarkdown(safeHtml) || post.summary) ?? ''
  const textContent = (htmlToText(body) || post.summary) ?? title

  const slugPath = post.slug ? `/${post.slug}` : `/post/${post.id}`
  let path = pathPrefix.replace(/\/$/, '') + slugPath
  if (seenPaths.has(path)) {
    path = `${path}-${post.id.slice(-6)}`
    warnings.push(`Duplicate path for post ${post.id}; using ${path}`)
  }
  seenPaths.add(path)

  const provenance = post.postUrl
    ? `Originally posted on Tumblr: ${post.postUrl}`
    : undefined

  const descriptionParts = [post.summary, provenance].filter(Boolean)
  const description = descriptionParts.length ? descriptionParts.join(' — ') : undefined

  const tags = post.tags.length ? post.tags : undefined

  const doc: StandardDocumentValue = {
    $type: 'site.standard.document',
    site,
    title,
    publishedAt,
    path,
    description,
    tags,
    textContent,
    content: {
      $type: 'site.standard.content.markdown',
      text: markdown,
      version: '1.0',
    },
  }

  validateDocument(doc, post.id)
  return doc
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function validateDocument(
  doc: StandardDocumentValue,
  postId: string,
): void {
  if (!doc.site) throw new Error(`Post ${postId}: missing site`)
  if (doc.site.startsWith('at://')) {
    if (!isPublicationAtUri(doc.site)) {
      throw new Error(`Post ${postId}: site is not a site.standard.publication AT URI "${doc.site}"`)
    }
  } else {
    try {
      new URL(doc.site)
    } catch {
      throw new Error(`Post ${postId}: invalid site URL "${doc.site}"`)
    }
  }

  if (!doc.title || !doc.title.trim()) {
    throw new Error(`Post ${postId}: empty title`)
  }

  if (!doc.publishedAt) {
    throw new Error(`Post ${postId}: missing publishedAt`)
  }
  const publishedMs = new Date(doc.publishedAt).getTime()
  if (Number.isNaN(publishedMs)) {
    throw new Error(`Post ${postId}: invalid publishedAt "${doc.publishedAt}"`)
  }

  if (doc.tags !== undefined) {
    if (!Array.isArray(doc.tags) || doc.tags.some((t) => typeof t !== 'string')) {
      throw new Error(`Post ${postId}: tags must be an array of strings`)
    }
  }

  if (doc.content) {
    if (doc.content.$type !== 'site.standard.content.markdown') {
      throw new Error(`Post ${postId}: unsupported content type "${doc.content.$type}"`)
    }
    if (typeof doc.content.text !== 'string') {
      throw new Error(`Post ${postId}: content.text must be a string`)
    }
  }
}

/**
 * Validate a site value before publishing.
 *
 * `site` may be an `https://` publication URL or an AT URI pointing at a
 * `site.standard.publication` record.
 */
export function validateSite(site: string): void {
  if (!site) throw new Error('site is required')
  if (site.startsWith('at://')) {
    if (!isPublicationAtUri(site)) {
      throw new Error(`Invalid publication AT URI: ${site}`)
    }
    return
  }
  try {
    new URL(site)
  } catch {
    throw new Error(`Invalid site URL: ${site}`)
  }
}
