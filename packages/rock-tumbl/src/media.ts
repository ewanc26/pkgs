/**
 * Media upload for imported documents.
 *
 * Tumblr exports reference media as relative paths (`../../media/200_0.png`).
 * Publishing those references as-is leaves broken images on Standard.site, so
 * `--upload-media` reads the referenced files from the archive, uploads each
 * one to the PDS once, and rewrites the HTML to point at the resulting blob.
 */

import { openAsBlob } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { BlobReader, Uint8ArrayWriter, type FileEntry, ZipReader } from '@zip.js/zip.js'
import { archivePath, isUnsafeEntryName, localMediaPath, mimeFor } from './archive.js'
import { parseHtmlFragment } from './dom.js'
import type { AtProtoBlobRef, TumblrPost } from './types.js'

/** PDS blob size limit used when deciding what to skip. */
export const DEFAULT_MAX_BLOB_BYTES = 5 * 1024 * 1024

export interface MediaArchive {
  read(localPath: string): Promise<Uint8Array | undefined>
  close(): Promise<void>
}

/** Open the media directory of a ZIP or extracted export. */
export async function openMediaArchive(inputPath: string): Promise<MediaArchive> {
  const st = await stat(inputPath).catch(() => null)
  if (!st) throw new Error(`Input not found: ${inputPath}`)

  if (st.isFile()) {
    if (!inputPath.toLowerCase().endsWith('.zip')) {
      throw new Error(`Input is not a .zip file: ${inputPath}`)
    }
    return openZipMedia(inputPath)
  }

  if (st.isDirectory()) return openDirectoryMedia(resolve(inputPath))

  throw new Error(`Unsupported input type: ${inputPath}`)
}

async function openZipMedia(inputPath: string): Promise<MediaArchive> {
  const zip = new ZipReader(new BlobReader(await openAsBlob(inputPath)))
  const entries = new Map<string, FileEntry>()

  for (const entry of await zip.getEntries()) {
    if (!entry.filename || entry.filename.endsWith('/')) continue
    if (isUnsafeEntryName(entry.filename)) {
      throw new Error(`Unsafe archive entry path: ${entry.filename}`)
    }
    entries.set(archivePath(entry.filename), entry as FileEntry)
  }

  return {
    async read(localPath: string) {
      const entry = entries.get(archivePath(localPath))
      if (!entry) return undefined
      return (await entry.getData(new Uint8ArrayWriter())) as Uint8Array
    },
    async close() {
      await zip.close()
    },
  }
}

function openDirectoryMedia(root: string): MediaArchive {
  return {
    async read(localPath: string) {
      if (isUnsafeEntryName(localPath)) return undefined
      const full = resolve(root, localPath)
      if (full !== root && !full.startsWith(root + sep)) return undefined
      try {
        return new Uint8Array(await readFile(full))
      } catch {
        return undefined
      }
    },
    async close() {
      // Nothing to release for a directory.
    },
  }
}

/**
 * Replace relative `media/...` references in post HTML with uploaded blob URLs.
 */
export function rewriteMediaReferences(
  html: string,
  urlByPath: Map<string, string>,
): string {
  if (!html || urlByPath.size === 0) return html

  const root = parseHtmlFragment(html)
  for (const el of Array.from(root.querySelectorAll('[src], [href]'))) {
    for (const attr of ['src', 'href']) {
      const value = el.getAttribute(attr)
      if (!value) continue
      const localPath = localMediaPath(value)
      if (!localPath) continue
      const url = urlByPath.get(localPath)
      if (url) el.setAttribute(attr, url)
    }
  }

  return root.innerHTML
}

/** The subset of StandardSitePublisher needed to upload media. */
export interface BlobUploader {
  uploadBlob(data: Uint8Array, mimeType: string, dryRun?: boolean): Promise<AtProtoBlobRef>
  getBlobUrl(cid: string): string
}

export interface MediaUploadOptions {
  dryRun?: boolean
  maxBytes?: number
  onLog?: (level: 'info' | 'warn' | 'error', msg: string) => void
  /** Called after each file is processed (uploaded, skipped, or failed). */
  onProgress?: (done: number, total: number, path: string) => void
}

export interface MediaUploadResult {
  /** Local media path → public blob URL, for rewriting document HTML. */
  urlByPath: Map<string, string>
  uploaded: number
  skipped: number
  failed: number
  bytes: number
}

/**
 * Upload every locally available media file referenced by `posts`, deduplicated
 * by archive path. Remote Tumblr URLs are left untouched.
 */
export async function uploadArchiveMedia(
  uploader: BlobUploader,
  inputPath: string,
  posts: TumblrPost[],
  options: MediaUploadOptions = {},
): Promise<MediaUploadResult> {
  const onLog = options.onLog ?? (() => {})
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BLOB_BYTES

  const files = new Map<string, string>()
  for (const post of posts) {
    for (const media of post.media) {
      if (!media.localPath) continue
      if (!files.has(media.localPath)) {
        files.set(media.localPath, media.mimeType ?? mimeFor(media.localPath) ?? 'application/octet-stream')
      }
    }
  }

  const result: MediaUploadResult = {
    urlByPath: new Map(),
    uploaded: 0,
    skipped: 0,
    failed: 0,
    bytes: 0,
  }

  if (files.size === 0) return result

  const archive = await openMediaArchive(inputPath)
  let done = 0
  try {
    for (const [path, mimeType] of files) {
      const data = await archive.read(path)
      if (!data) {
        onLog('warn', `Media file missing from archive: ${path}`)
        result.failed++
        options.onProgress?.(++done, files.size, path)
        continue
      }
      if (data.byteLength > maxBytes) {
        onLog(
          'warn',
          `Skipping ${path}: ${data.byteLength} bytes exceeds the ${maxBytes}-byte blob limit`,
        )
        result.skipped++
        options.onProgress?.(++done, files.size, path)
        continue
      }

      try {
        const blob = await uploader.uploadBlob(data, mimeType, options.dryRun)
        const cid = blob.ref?.$link
        if (!cid) throw new Error('uploadBlob returned no CID')
        if (!options.dryRun) result.urlByPath.set(path, uploader.getBlobUrl(cid))
        result.uploaded++
        result.bytes += data.byteLength
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        onLog('warn', `Failed to upload ${path}: ${message}`)
        result.failed++
      }
      options.onProgress?.(++done, files.size, path)
    }
  } finally {
    await archive.close()
  }

  return result
}
