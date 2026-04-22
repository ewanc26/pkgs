/**
 * Fetch all documents belonging to a publication and convert them to Markdown.
 *
 * Resolves the DID to a PDS endpoint, fetches the publication record,
 * lists all documents that reference it, converts each to Markdown
 * (with front matter), and writes the files to disk.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { documentToMarkdown } from './convert.js'
import { listDocuments, resolvePdsEndpoint } from './pds.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchPublicationOptions {
  /** DID of the repo owner. */
  did: string
  /** rkey of the site.standard.publication record. */
  rkey: string
  /** Directory to write Markdown files to. Defaults to ~/Downloads. */
  outputDir?: string
  /** Prepend YAML front matter to each file. @default true */
  frontmatter?: boolean
  /** Override the auto-resolved PDS endpoint. */
  pdsEndpoint?: string
}

export interface FetchResult {
  /** The document's record key. */
  rkey: string
  /** The document's title. */
  title: string
  /** Absolute path to the written Markdown file. */
  outputPath: string
}

// ─── fetchPublication ────────────────────────────────────────────────────────

/**
 * Fetch all documents belonging to a publication and convert them to Markdown.
 *
 * Resolves the DID to its PDS endpoint, fetches the publication record,
 * lists all `site.standard.document` records that reference it, converts
 * each to Markdown, and writes the files to the output directory.
 *
 * Files are named `{rkey}.md`.
 */
export async function fetchPublication(
  opts: FetchPublicationOptions,
): Promise<FetchResult[]> {
  const {
    did,
    rkey,
    frontmatter = true,
  } = opts

  const outputDir = opts.outputDir ?? join(homedir(), 'Downloads')

  // Resolve PDS endpoint
  const pds = opts.pdsEndpoint ?? await resolvePdsEndpoint(did)

  // List documents belonging to the publication
  const documents = await listDocuments(pds, did, rkey)

  if (documents.length === 0) {
    return []
  }

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true })

  // Convert and write each document
  const results: FetchResult[] = []

  for (const { rkey: docRkey, doc } of documents) {
    const markdown = documentToMarkdown(doc, { frontmatter })
    const outputPath = join(outputDir, `${docRkey}.md`)

    await writeFile(outputPath, markdown, 'utf-8')

    results.push({
      rkey: docRkey,
      title: doc.title,
      outputPath,
    })
  }

  return results
}
