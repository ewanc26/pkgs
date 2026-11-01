/**
 * Tumblr export archive detection and parsing.
 *
 * Tumblr's per-blog export has changed shape more than once. The layouts this
 * module understands are:
 *
 *  - a directory or ZIP holding `posts/html/{id}.html` plus `media/`
 *    (the current export; the HTML cover is the only post data it carries);
 *  - the same, wrapped in a nested `posts.zip` (the current download is a
 *    ZIP of a ZIP);
 *  - an older layout with `posts/posts.xml`, optionally alongside
 *    `posts/html/{id}.html`.
 *
 * Input may be a .zip file or an already-extracted directory. All parsing is
 * local; nothing is uploaded to a third party.
 */

import {
  TextWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  type FileEntry,
  ZipReader,
} from '@zip.js/zip.js'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import type { ArchiveLayout, ParsedArchive, TumblrMedia, TumblrPost, TumblrPostType } from './types.js'
import { parseHtmlFragment, parseXmlDocument } from './dom.js'

// ─── Safety limits ──────────────────────────────────────────────────────────

const MAX_ENTRIES = 50_000
const MAX_ENTRY_SIZE = 50 * 1024 * 1024 // 50 MB per entry
const MAX_TOTAL_UNCOMPRESSED = 2 * 1024 * 1024 * 1024 // 2 GB
const MAX_NESTING = 2

// ─── Path safety ────────────────────────────────────────────────────────────

function isUnsafeEntryName(name: string): boolean {
  // Tumblr's own posts.zip stores entries with a leading slash (/style.css).
  // Nothing is written to disk, so a leading slash is stripped rather than
  // rejected; a `..` segment is still refused outright.
  const parts = archivePath(name).split('/')
  return parts.some((p) => p === '..')
}

function archivePath(name: string): string {
  return name.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '')
}

// ─── Layout detection ───────────────────────────────────────────────────────

export interface DetectResult {
  layout: ArchiveLayout
  inputPath: string
  hasPostsXml: boolean
  hasPostsHtml: boolean
  hasNestedPostsZip: boolean
  hasMedia: boolean
  entryCount: number
}

/**
 * Detect the Tumblr export layout of a ZIP file or directory without fully
 * parsing it. Throws a descriptive error for unsupported/empty inputs.
 */
export async function detectLayout(inputPath: string): Promise<DetectResult> {
  const st = await stat(inputPath).catch(() => null)
  if (!st) {
    throw new Error(`Input not found: ${inputPath}`)
  }

  if (st.isFile()) {
    return detectZip(inputPath)
  }
  if (st.isDirectory()) {
    return detectDirectory(inputPath)
  }
  throw new Error(`Unsupported input type: ${inputPath}`)
}

async function detectZip(inputPath: string): Promise<DetectResult> {
  if (!inputPath.toLowerCase().endsWith('.zip')) {
    throw new Error(`Input is not a .zip file: ${inputPath}`)
  }

  const zip = new ZipReader(new Uint8ArrayReader(new Uint8Array(await readFile(inputPath))))
  try {
    const entries = await zip.getEntries()
    if (entries.length > MAX_ENTRIES) {
      throw new Error(`Too many entries (${entries.length}); aborting for safety`)
    }

    let hasPostsXml = false
    let hasPostsHtml = false
    let hasNestedPostsZip = false
    let hasMedia = false
    let totalUncompressed = 0

    for (const entry of entries) {
      if (isUnsafeEntryName(entry.filename)) {
        throw new Error(`Unsafe archive entry path: ${entry.filename}`)
      }
      const name = archivePath(entry.filename).toLowerCase()
      if (isPostsXml(name)) hasPostsXml = true
      if (isPostHtml(name)) hasPostsHtml = true
      if (basename(name) === 'posts.zip') hasNestedPostsZip = true
      if (name.startsWith('media/')) hasMedia = true
      const size = Number(entry.uncompressedSize ?? 0)
      if (size > MAX_ENTRY_SIZE) {
        throw new Error(`Entry too large (${size} bytes): ${entry.filename}`)
      }
      totalUncompressed += size
      if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
        throw new Error(`Archive decompresses to >${MAX_TOTAL_UNCOMPRESSED} bytes; aborting for safety`)
      }
    }

    const layout = hasPostsXml ? 'posts-xml' : hasPostsHtml || hasNestedPostsZip ? 'posts-html' : 'unknown'

    return {
      layout,
      inputPath,
      hasPostsXml,
      hasPostsHtml,
      hasNestedPostsZip,
      hasMedia,
      entryCount: entries.length,
    }
  } finally {
    await zip.close()
  }
}

async function detectDirectory(inputPath: string): Promise<DetectResult> {
  let hasPostsXml = false
  let hasPostsHtml = false
  let hasNestedPostsZip = false
  let hasMedia = false
  let entryCount = 0

  await walk(inputPath, inputPath, (rel) => {
    entryCount++
    const name = rel.toLowerCase()
    if (isPostsXml(name)) hasPostsXml = true
    if (isPostHtml(name)) hasPostsHtml = true
    if (name === 'posts.zip' || name.endsWith('/posts.zip')) hasNestedPostsZip = true
    if (name.startsWith('media/')) hasMedia = true
  })

  if (entryCount > MAX_ENTRIES) {
    throw new Error(`Too many files (${entryCount}); aborting for safety`)
  }

  const layout = hasPostsXml ? 'posts-xml' : hasPostsHtml || hasNestedPostsZip ? 'posts-html' : 'unknown'

  return { layout, inputPath, hasPostsXml, hasPostsHtml, hasNestedPostsZip, hasMedia, entryCount }
}

function isPostsXml(name: string): boolean {
  return name === 'posts/posts.xml' || name.endsWith('/posts/posts.xml')
}

/** Any `<something>/html/<id>.html`, whether prefixed with posts/ or not. */
function isPostHtml(name: string): boolean {
  return postIdFromPath(name) !== undefined
}

function postIdFromPath(name: string): string | undefined {
  const m = /(?:^|\/)html\/([A-Za-z0-9_-]+)\.html$/.exec(name)
  return m?.[1]
}

async function walk(dir: string, root: string, onFile: (relPath: string) => void): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    // `full` is absolute; report paths relative to the archive root.
    const rel = relative(root, full).replace(/\\/g, '/')
    if (entry.isDirectory()) {
      await walk(full, root, onFile)
    } else if (entry.isFile()) {
      onFile(rel)
    }
  }
}

// ─── Parsing ────────────────────────────────────────────────────────────────

interface SourceFile {
  path: string
  text: string
}

interface SourceBundle {
  sources: SourceFile[]
  mediaFiles: Set<string>
}

/**
 * Parse a Tumblr export (ZIP or directory) into a ParsedArchive.
 */
export async function parseArchive(
  inputPath: string,
  options: { includePrivate?: boolean } = {},
): Promise<ParsedArchive> {
  const { includePrivate = false } = options
  const detection = await detectLayout(inputPath)
  const warnings: string[] = []

  if (detection.layout === 'unknown') {
    throw new Error(
      'Unrecognised Tumblr export layout. Expected posts/html/*.html or posts/posts.xml, ' +
        'directly or inside a nested posts.zip.',
    )
  }

  const bundle = await readSources(detection, warnings)
  const posts = buildPosts(bundle, warnings, includePrivate)

  // Sort by date ascending so imports are chronological
  posts.sort((a, b) => a.date.localeCompare(b.date))

  return {
    layout: detection.layout,
    blogName: posts[0]?.blogName,
    posts,
    warnings,
  }
}

// ─── Source reading ─────────────────────────────────────────────────────────

function isSourceFile(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    isPostsXml(lower) ||
    isPostHtml(lower) ||
    basename(lower) === 'comments.csv'
  )
}

function isMediaFile(name: string): boolean {
  return name.toLowerCase().startsWith('media/')
}

async function readSources(detection: DetectResult, warnings: string[]): Promise<SourceBundle> {
  if (detection.inputPath.toLowerCase().endsWith('.zip')) {
    const bytes = new Uint8Array(await readFile(detection.inputPath))
    const bundle = await readZipSources(bytes, warnings, 0)
    if (bundle.sources.length === 0) {
      throw new Error('Archive contains no post HTML or posts.xml')
    }
    return bundle
  }

  return readDirectorySources(resolve(detection.inputPath), warnings)
}

async function readZipSources(
  bytes: Uint8Array,
  warnings: string[],
  depth: number,
): Promise<SourceBundle> {
  if (depth > MAX_NESTING) {
    throw new Error(`Archives nested deeper than ${MAX_NESTING} levels`)
  }

  const zip = new ZipReader(new Uint8ArrayReader(bytes))
  const sources: SourceFile[] = []
  const mediaFiles = new Set<string>()

  try {
    const entries = await zip.getEntries()
    if (entries.length > MAX_ENTRIES) {
      throw new Error(`Too many entries (${entries.length}); aborting for safety`)
    }

    let totalUncompressed = 0
    for (const entry of entries) {
      if (isUnsafeEntryName(entry.filename)) {
        throw new Error(`Unsafe archive entry path: ${entry.filename}`)
      }
      const path = archivePath(entry.filename)
      const name = path.toLowerCase()
      const size = Number(entry.uncompressedSize ?? 0)
      if (size > MAX_ENTRY_SIZE) {
        throw new Error(`Entry too large (${size} bytes): ${entry.filename}`)
      }
      totalUncompressed += size
      if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
        throw new Error(`Archive decompresses to >${MAX_TOTAL_UNCOMPRESSED} bytes; aborting for safety`)
      }

      if (isMediaFile(name)) {
        mediaFiles.add(path)
        continue
      }

      // The standard export is a ZIP of a ZIP; descend into the inner one.
      if (basename(name) === 'posts.zip') {
        const nestedBytes = await (entry as FileEntry).getData(new Uint8ArrayWriter())
        const nested = await readZipSources(nestedBytes, warnings, depth + 1)
        sources.push(...nested.sources)
        for (const media of nested.mediaFiles) mediaFiles.add(media)
        continue
      }

      if (!isSourceFile(name)) continue
      sources.push({
        path,
        text: await (entry as FileEntry).getData(new TextWriter()).then((out) => String(out)),
      })
    }
  } finally {
    await zip.close()
  }

  return { sources, mediaFiles }
}

async function readDirectorySources(root: string, warnings: string[]): Promise<SourceBundle> {
  const mediaFiles = new Set<string>()
  const sourcePaths: string[] = []

  await walk(root, root, (rel) => {
    if (isMediaFile(rel)) mediaFiles.add(rel)
    else if (isSourceFile(rel)) sourcePaths.push(rel)
  })

  // The export may have been extracted without unpacking the inner posts.zip.
  const sources: SourceFile[] = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.toLowerCase() !== 'posts.zip') continue
    const bytes = new Uint8Array(await readFile(join(root, entry.name)))
    const nested = await readZipSources(bytes, warnings, 1)
    sources.push(...nested.sources)
    for (const media of nested.mediaFiles) mediaFiles.add(media)
  }

  for (const path of sourcePaths) {
    try {
      sources.push({ path, text: await readFile(join(root, path), 'utf-8') })
    } catch (err) {
      warnings.push(`Could not read ${path}: ${String(err)}`)
    }
  }

  return { sources, mediaFiles }
}

// ─── Post building ──────────────────────────────────────────────────────────

function buildPosts(bundle: SourceBundle, warnings: string[], includePrivate: boolean): TumblrPost[] {
  const xmlSource = bundle.sources.find((s) => isPostsXml(s.path.toLowerCase()))
  const htmlSources = bundle.sources.filter((s) => postIdFromPath(s.path.toLowerCase()))
  const commentsSource = bundle.sources.find((s) => basename(s.path.toLowerCase()) === 'comments.csv')

  const postsXml = xmlSource ? parsePostsXmlSafely(xmlSource, warnings) : []
  const byId = new Map(postsXml.map((p) => [p.id, p]))

  for (const htmlSource of htmlSources) {
    const id = postIdFromPath(htmlSource.path.toLowerCase())
    if (!id) continue
    const existing = byId.get(id)
    if (existing) {
      existing.body = htmlSource.text
      existing.sourceFile = htmlSource.path
      if (existing.tags.length === 0) {
        existing.tags = htmlMetadata(htmlSource.text).tags
      }
    } else {
      const post = parseHtmlPost(htmlSource.text, id, htmlSource.path, bundle.mediaFiles, warnings)
      byId.set(id, post)
    }
  }

  const blogName =
    inferBlogFromComments(commentsSource?.text, new Set(byId.keys())) ??
    postsXml.map((p) => p.blogName).find(Boolean)

  if (blogName) {
    for (const post of byId.values()) {
      if (!post.blogName) {
        post.blogName = blogName
        post.blogUrl = `https://${blogName}.tumblr.com`
      }
    }
  }

  const posts = Array.from(byId.values())
  return posts.filter((p) => includePrivate || !(p.isPrivate || p.isDraft))
}

function htmlMetadata(html: string): { tags: string[]; title?: string } {
  const root = parseHtmlFragment(html)
  const footer = root.querySelector('#footer')
  const tags = footer
    ? Array.from(footer.querySelectorAll('span.tag'))
        .map((el) => (el.textContent ?? '').trim())
        .filter(Boolean)
    : []
  const title = (root.querySelector('h1')?.textContent ?? '').trim() || undefined
  return { tags, title }
}

/**
 * Build a post from the per-post HTML cover alone.
 *
 * The current export carries no post metadata beyond what the HTML shows: the
 * post id is the filename, the body is the markup, tags and the timestamp sit
 * in the footer, and media references point into the sibling media directory.
 * The canonical Tumblr permalink is not present, so `postUrl` is left unset.
 */
function parseHtmlPost(
  html: string,
  id: string,
  sourcePath: string,
  mediaFiles: Set<string>,
  warnings: string[],
): TumblrPost {
  const root = parseHtmlFragment(html)

  const footer = root.querySelector('#footer')
  const timestampEl = footer?.querySelector('#timestamp')
  const timestampText = (timestampEl?.textContent ?? '').trim()
  const date = parseExportTimestamp(timestampText)
  if (!date) {
    warnings.push(`Post ${id}: unreadable export timestamp "${timestampText}"`)
  }

  const tags = footer
    ? Array.from(footer.querySelectorAll('span.tag'))
        .map((el) => (el.textContent ?? '').trim())
        .filter(Boolean)
    : []

  const heading = root.querySelector('h1')
  const title = (heading?.textContent ?? '').trim() || undefined

  // The footer and an empty placeholder <h1> are export chrome, not post text.
  footer?.remove()
  if (heading && !title) heading.remove()

  const body = root.innerHTML.trim()
  const media = collectMedia(root, mediaFiles)
  const summary = bodyText(root)
  const firstLine = summary.split('\n').find((line) => line.trim().length > 0)

  return {
    id,
    blogName: undefined,
    type: media.some((m) => m.type === 'photo') ? 'photo' : 'text',
    title: title ?? truncateTitle(firstLine),
    body: body || undefined,
    summary: summary || undefined,
    tags,
    date: date ?? new Date().toISOString(),
    media,
    isPrivate: false,
    isDraft: false,
    sourceFile: sourcePath,
  }
}

function truncateTitle(text?: string): string | undefined {
  if (!text) return undefined
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return undefined
  if (clean.length <= 80) return clean
  const cut = clean.slice(0, 80)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…'
}

function bodyText(root: Element): string {
  const parts: string[] = []
  const visit = (el: Element): void => {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) {
        parts.push(node.textContent ?? '')
      } else if (node.nodeType === 1) {
        const child = node as Element
        const tag = child.tagName.toLowerCase()
        if (tag === 'script' || tag === 'style') continue
        visit(child)
        if (tag === 'br' || tag === 'p' || tag === 'div' || tag === 'blockquote' || tag === 'li') {
          parts.push('\n')
        }
      }
    }
  }
  visit(root)
  return parts
    .join('')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

// ─── Media ──────────────────────────────────────────────────────────────────

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
}

function collectMedia(root: Element, mediaFiles: Set<string>): TumblrMedia[] {
  const seen = new Set<string>()
  const media: TumblrMedia[] = []

  const add = (item: TumblrMedia): void => {
    if (seen.has(item.url)) return
    seen.add(item.url)
    media.push(item)
  }

  for (const img of Array.from(root.querySelectorAll('img'))) {
    const src = img.getAttribute('src')
    if (!src) continue
    const entry: TumblrMedia = { type: 'photo', url: src }
    const localPath = localMediaPath(src)
    if (localPath && mediaFiles.has(localPath)) entry.localPath = localPath
    const alt = (img.getAttribute('alt') ?? '').trim()
    if (alt) entry.altText = alt
    const width = Number(img.getAttribute('data-orig-width') ?? img.getAttribute('width'))
    const height = Number(img.getAttribute('data-orig-height') ?? img.getAttribute('height'))
    if (Number.isFinite(width) && width > 0) entry.width = width
    if (Number.isFinite(height) && height > 0) entry.height = height
    const mimeType = mimeFor(src)
    if (mimeType) entry.mimeType = mimeType
    add(entry)
  }

  for (const video of Array.from(root.querySelectorAll('video'))) {
    const src = video.getAttribute('src') ?? video.querySelector('source')?.getAttribute('src')
    if (!src) continue
    const entry: TumblrMedia = { type: 'video', url: src }
    const localPath = localMediaPath(src)
    if (localPath && mediaFiles.has(localPath)) entry.localPath = localPath
    const mimeType = mimeFor(src)
    if (mimeType) entry.mimeType = mimeType
    add(entry)
  }

  for (const figure of Array.from(root.querySelectorAll('figure.tmblr-embed'))) {
    const provider = figure.getAttribute('data-provider')
    const url = figure.getAttribute('data-url')
    if (!url) continue
    // Embedded players are links, not archive files; record the source URL and
    // let the converter keep the surrounding text.
    const type = provider === 'youtube' || provider === 'vimeo' || provider === 'tumblr' ? 'video' : 'photo'
    add({ type, url })
  }

  return media
}

function localMediaPath(src: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return undefined
  let path = src.replace(/\\/g, '/')
  while (path.startsWith('../')) path = path.slice(3)
  path = path.replace(/^\.\//, '')
  return path.startsWith('media/') ? path : undefined
}

function mimeFor(path: string): string | undefined {
  const match = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(path)
  return match ? MIME_BY_EXTENSION[match[1].toLowerCase()] : undefined
}

// ─── comments.csv ───────────────────────────────────────────────────────────

/**
 * comments.csv names the blog that owns a commented-on post. Rows for post ids
 * we exported therefore identify this export's own blog, which the HTML cover
 * does not otherwise state.
 */
function inferBlogFromComments(csv: string | undefined, exportedIds: Set<string>): string | undefined {
  if (!csv) return undefined
  const counts = new Map<string, number>()
  const lines = csv.split(/\r?\n/)
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    // post_blog,post_id,reply_id,date,content — the first three fields never
    // contain commas, so a prefix split is enough and avoids a full CSV parser.
    const [postBlog, postId] = line.split(',', 3)
    if (!postBlog || !postId) continue
    if (!exportedIds.has(postId)) continue
    counts.set(postBlog, (counts.get(postBlog) ?? 0) + 1)
  }
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  return ranked[0]?.[0]
}

// ─── posts.xml parsing ──────────────────────────────────────────────────────

/**
 * Parse posts.xml, downgrading structural problems to a warning so that any
 * per-post HTML covers can still be imported.
 */
function parsePostsXmlSafely(source: SourceFile, warnings: string[]): TumblrPost[] {
  try {
    return parsePostsXml(source.text, warnings)
  } catch (err) {
    warnings.push(`Could not parse ${source.path}: ${String(err)}`)
    return []
  }
}

function parsePostsXml(xml: string, warnings: string[]): TumblrPost[] {
  const doc = parseXmlSafely(xml)
  const postsEl = doc.documentElement
  if (!postsEl || postsEl.tagName.toLowerCase() !== 'posts') {
    throw new Error('posts.xml does not contain a <posts> root element')
  }

  const postEls = Array.from(postsEl.getElementsByTagName('post'))
  const posts: TumblrPost[] = []

  for (const el of postEls) {
    try {
      const post = parsePostElement(el, warnings)
      if (post) posts.push(post)
    } catch (err) {
      warnings.push(`Failed to parse post ${getAttr(el, 'id') ?? '?'}: ${String(err)}`)
    }
  }

  return posts
}

function parsePostElement(el: Element, warnings: string[]): TumblrPost | null {
  const id = getAttr(el, 'id')
  if (!id) {
    warnings.push('Skipping post with no id attribute')
    return null
  }

  const type = normalizePostType(getAttr(el, 'type') ?? 'regular')
  const url = getAttr(el, 'url')
  const timestamp = getAttr(el, 'timestamp')
  const dateAttr = getAttr(el, 'date')
  const slug = getAttr(el, 'slug')
  const state = getAttr(el, 'state')
  const privateAttr = getAttr(el, 'private')

  const date = isoDate(dateAttr ?? timestamp ?? undefined)
  const tags = [
    ...parseTags(getText(el, 'tags')),
    ...Array.from(el.getElementsByTagName('tag'))
      .map((tag) => (tag.textContent ?? '').trim())
      .filter(Boolean),
  ]
  const blogName = inferBlogName(url)

  const isDraft = state === 'draft' || state === 'queue' || privateAttr === 'yes'
  const isPrivate = privateAttr === 'yes' || getAttr(el, 'password-protected') === 'yes'

  // Body HTML: pick the type-appropriate field
  let body = ''
  switch (type) {
    case 'text':
      body = getText(el, 'regular-body')
      if (!body && el.textContent.trim()) body = el.textContent.trim()
      break
    case 'photo':
      body = getText(el, 'photo-caption')
      break
    case 'quote':
      body = getText(el, 'quote-text')
      break
    case 'link':
      body = getText(el, 'link-description')
      break
    case 'chat':
      body = getText(el, 'conversation')
      break
    case 'audio':
      body = getText(el, 'audio-caption') ?? getText(el, 'audio-body')
      break
    case 'video':
      body = getText(el, 'video-caption')
      break
    case 'answer':
      body = getText(el, 'answer-body') ?? getText(el, 'regular-body')
      break
  }

  const media: TumblrMedia[] = []
  const photo1280 = getText(el, 'photo-url-1280') || getText(el, 'photo-url-highres')
  const photo250 = getText(el, 'photo-url-250')
  const photo500 = getText(el, 'photo-url-500')
  if (photo1280) media.push({ type: 'photo', url: photo1280, altText: getText(el, 'photo-caption') })
  if (photo250 && photo250 !== photo1280) media.push({ type: 'photo', url: photo250 })
  if (photo500 && photo500 !== photo1280) media.push({ type: 'photo', url: photo500 })

  const videoUrl = getText(el, 'video-url')
  if (videoUrl) media.push({ type: 'video', url: videoUrl })

  const audioUrl = getText(el, 'audio-url')
  if (audioUrl) media.push({ type: 'audio', url: audioUrl })

  const sourceUrl = getText(el, 'link-url')
  const sourceTitle = getText(el, 'link-title') || getText(el, 'link-text')

  const title =
    getText(el, 'regular-title') ||
    getText(el, 'quote-source') ||
    getText(el, 'link-title') ||
    getText(el, 'photo-caption') ||
    undefined

  const summary = getText(el, 'regular-body') ?? getText(el, 'quote-text') ?? undefined

  const postUrl = url
  return {
    id,
    postUrl,
    blogName,
    blogUrl: blogName ? `https://${blogName}.tumblr.com` : undefined,
    type,
    title,
    body: body || undefined,
    summary,
    tags,
    date,
    timestamp: timestamp ? Number(timestamp) : undefined,
    media,
    sourceUrl,
    sourceTitle,
    isPrivate,
    isDraft,
    slug: slug || undefined,
    sourceFile: 'posts/posts.xml',
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseXmlSafely(xml: string): Document {
  const doc = parseXmlDocument(xml)
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error(`Invalid XML: ${parseError.textContent ?? 'parse error'}`)
  }
  return doc
}

function getAttr(el: Element, name: string): string | undefined {
  const v = el.getAttribute(name)
  return v === null || v === '' ? undefined : v
}

function getText(el: Element, tagName: string): string {
  const child = el.querySelector(tagName)
  if (!child) return ''
  return child.textContent ?? ''
}

function normalizePostType(raw: string | undefined): TumblrPostType {
  const t = (raw ?? '').toLowerCase()
  switch (t) {
    case 'regular':
      return 'text'
    case 'text':
    case 'photo':
    case 'quote':
    case 'link':
    case 'chat':
    case 'audio':
    case 'video':
    case 'answer':
      return t as TumblrPostType
    default:
      return 'unknown'
  }
}

function parseTags(raw: string): string[] {
  if (!raw) return []
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function inferBlogName(url?: string): string | undefined {
  if (!url) return undefined
  const m = url.match(/https?:\/\/([^/]+?)\.tumblr\.com/)
  return m ? m[1] : undefined
}

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

/**
 * Parse the footer timestamp of a per-post HTML cover, e.g.
 * "October 30th, 2024 7:03am". The export prints local blog time with no
 * offset, so the value is interpreted as UTC and the README says so.
 */
export function parseExportTimestamp(text: string): string | undefined {
  const m = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(
    text.trim(),
  )
  if (!m) return undefined
  const month = MONTHS[m[1].toLowerCase()]
  if (month === undefined) return undefined
  const day = Number(m[2])
  const year = Number(m[3])
  let hour = Number(m[4])
  const minute = Number(m[5])
  const meridiem = m[6].toLowerCase()
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  if (hour > 23 || minute > 59 || day < 1 || day > 31) return undefined
  const date = new Date(Date.UTC(year, month, day, hour, minute))
  // Date.UTC rolls invalid days over (February 31st becomes March), so reject
  // timestamps that do not round-trip to the same calendar date.
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return undefined
  return date.toISOString()
}

function isoDate(input?: string | number): string {
  if (input === undefined || input === '') return new Date().toISOString()
  const n = typeof input === 'number' ? input : Number(input)
  if (!Number.isNaN(n) && String(input).trim() === String(n)) {
    // Unix seconds
    return new Date(n * 1000).toISOString()
  }
  const d = new Date(String(input))
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString()
  }
  return d.toISOString()
}
