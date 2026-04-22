/**
 * bismuth CLI
 *
 * Converts ATProto RTF-block documents to Markdown.
 * Supports pub.leaflet.content, site.standard.document,
 * blog.pckt.content, and app.offprint.content.
 *
 * Also supports fetching all documents belonging to a publication
 * via the `fetch` subcommand.
 *
 * Usage:
 *   bismuth [options] [file]        Convert a document to Markdown
 *   bismuth fetch [options]         Fetch all docs in a publication
 *
 * Options (convert):
 *   -f, --frontmatter   Emit YAML front matter from document metadata.
 *   -p, --page-break    String used to separate pages (default: "\\n\\n---\\n\\n").
 *       --did           Source DID for Pckt blob resolution.
 *   -o, --output        Write output to a file instead of stdout.
 *   -h, --help          Show this help text and exit.
 *       --version       Print version and exit.
 *
 * Options (fetch):
 *       --did DID       DID of the repo owner (required).
 *       --rkey RKEY     rkey of the publication (required).
 *       --output-dir    Directory to write files to (default: ~/Downloads).
 *       --no-frontmatter  Omit YAML front matter from output files.
 *       --pds URL        Override the auto-resolved PDS endpoint.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  documentToMarkdown,
  contentToMarkdown,
  pcktContentToMarkdown,
  offprintContentToMarkdown,
} from './convert.js'
import { fetchPublication } from './fetch.js'
import type {
  StandardDocument,
  LeafletContent,
  PcktContent,
  OffprintContent,
} from './types.js'

// ─── Version (injected by tsup at build time) ─────────────────────────────────
const PKG_VERSION = __BISMUTH_VERSION__

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  // ── Route subcommands ──────────────────────────────────────────────────────
  if (argv[0] === 'fetch') {
    return fetchCommand(argv.slice(1))
  }

  // ── Convert mode ──────────────────────────────────────────────────────────
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      frontmatter: { type: 'boolean', short: 'f', default: false },
      'page-break': { type: 'string', short: 'p' },
      did: { type: 'string' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: true,
  })

  if (values.version) {
    console.log(PKG_VERSION)
    return
  }

  if (values.help) {
    console.log(HELP)
    return
  }

  // ── Read input ─────────────────────────────────────────────────────────────
  let raw: string

  if (positionals.length > 0) {
    const filePath = positionals[0]!
    raw = await readFile(filePath, 'utf-8').catch((err: unknown) => {
      die(`Cannot read file "${filePath}": ${String(err)}`)
    }) as string
  } else {
    raw = await readStdin()
  }

  // ── Parse ──────────────────────────────────────────────────────────────────
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    die(`Invalid JSON: ${String(err)}`)
  }

  const opts = {
    frontmatter: values.frontmatter,
    pageBreak: values['page-break'],
  }

  // ── Dispatch ───────────────────────────────────────────────────────────────
  let markdown: string

  if (isStandardDocument(parsed)) {
    markdown = documentToMarkdown(parsed, opts)
  } else if (isLeafletContent(parsed)) {
    markdown = contentToMarkdown(parsed, opts)
  } else if (isPcktContent(parsed)) {
    markdown = await pcktContentToMarkdown(parsed, values.did, opts)
  } else if (isOffprintContent(parsed)) {
    markdown = offprintContentToMarkdown(parsed, opts)
  } else {
    die(
      'Input JSON must be one of:\n' +
      '  \u2022 site.standard.document\n' +
      '  \u2022 pub.leaflet.content\n' +
      '  \u2022 blog.pckt.content\n' +
      '  \u2022 app.offprint.content\n' +
      'Expected a "$type" field matching one of those values.',
    )
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  if (values.output) {
    await writeFile(values.output, markdown, 'utf-8').catch((err: unknown) => {
      die(`Cannot write to "${values.output}": ${String(err)}`)
    })
  } else {
    // Ignore EPIPE — the downstream consumer may close the pipe early
    // (e.g. when piping to `head`). This is expected, not an error.
    const onPipeError = (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') throw err
    }
    process.stdout.once('error', onPipeError)
    process.stdout.write(markdown)
    // Ensure a trailing newline when writing to stdout.
    if (!markdown.endsWith('\n')) process.stdout.write('\n')
    process.stdout.removeListener('error', onPipeError)
  }
}

// ─── fetch subcommand ────────────────────────────────────────────────────────

async function fetchCommand(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      did: { type: 'string' },
      rkey: { type: 'string' },
      'output-dir': { type: 'string' },
      'no-frontmatter': { type: 'boolean', default: false },
      pds: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
    strict: true,
  })

  if (values.help) {
    console.log(FETCH_HELP)
    return
  }

  if (!values.did) {
    die('fetch: --did is required')
  }
  if (!values.rkey) {
    die('fetch: --rkey is required')
  }

  const outputDir = values['output-dir'] ?? join(homedir(), 'Downloads')

  const results = await fetchPublication({
    did: values.did,
    rkey: values.rkey,
    outputDir,
    frontmatter: !values['no-frontmatter'],
    pdsEndpoint: values.pds,
  })

  if (results.length === 0) {
    console.error('No documents found for this publication.')
    return
  }

  console.error(`Fetched ${results.length} document${results.length === 1 ? '' : 's'} to ${outputDir}:`)
  for (const r of results) {
    console.error(`  ${r.rkey}  ${r.title}`)
  }
}

// ─── Type guards ──────────────────────────────────────────────────────────────

function isStandardDocument(v: unknown): v is StandardDocument {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  // $type is optional on the type but we want to distinguish the two shapes.
  if (r['$type'] && r['$type'] !== 'site.standard.document') return false
  return typeof r['title'] === 'string' && typeof r['site'] === 'string'
}

function isLeafletContent(v: unknown): v is LeafletContent {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return r['$type'] === 'pub.leaflet.content' && Array.isArray(r['pages'])
}

function isPcktContent(v: unknown): v is PcktContent {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return r['$type'] === 'blog.pckt.content'
}

function isOffprintContent(v: unknown): v is OffprintContent {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return r['$type'] === 'app.offprint.content' && Array.isArray(r['items'])
}

// ─── Stdin helper ─────────────────────────────────────────────────────────────

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const stream = createReadStream('/dev/stdin')
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk as Buffer)))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    stream.on('error', reject)
  })
}

// ─── Error helper ─────────────────────────────────────────────────────────────

function die(msg: string): never {
  console.error(`bismuth: ${msg}`)
  process.exit(1)
}

// ─── Help text ────────────────────────────────────────────────────────────────

const HELP = `\
Usage: bismuth [options] [file]

Convert ATProto RTF-block documents to Markdown.
Supports: site.standard.document, pub.leaflet.content,
          blog.pckt.content, app.offprint.content.

Commands:
  fetch              Fetch all documents in a publication.

Arguments:
  file               JSON file to read. Reads stdin if omitted.

Options:
  -f, --frontmatter     Emit YAML front matter from document metadata.
  -p, --page-break STR  Separator between pages (default: "\\n\\n---\\n\\n").
      --did DID          Source DID for Pckt blob resolution.
  -o, --output FILE     Write output to FILE instead of stdout.
  -h, --help            Show this help text and exit.
      --version          Print version and exit.

Examples:
  # Convert a Standard.site document, with front matter
  bismuth --frontmatter doc.json

  # Pipe from another command
  cat doc.json | bismuth --frontmatter > post.md

  # Pckt content with blob resolution
  bismuth --did did:plc:abc123 pckt-post.json

  # Multi-page Leaflet document — custom page separator
  bismuth --page-break $'\\n\\n<!-- page -->\\n\\n' doc.json

  # Fetch all documents in a publication
  bismuth fetch --did did:plc:abc123 --rkey 3mfyq5mpohw25
`

const FETCH_HELP = `\
Usage: bismuth fetch [options]

Fetch all site.standard.document records belonging to a
site.standard.publication, convert them to Markdown, and
save the files to the output directory.

Files are named {rkey}.md.

Options:
      --did DID             DID of the repo owner (required).
      --rkey RKEY           rkey of the publication (required).
      --output-dir DIR      Directory to write files to (default: ~/Downloads).
      --no-frontmatter      Omit YAML front matter from output files.
      --pds URL             Override the auto-resolved PDS endpoint.
  -h, --help                Show this help text and exit.

Examples:
  # Fetch all documents from a publication
  bismuth fetch --did did:plc:ofrbh253gwicbkc5nktqepol --rkey 3mfyq5mpohw25

  # Fetch to a custom directory
  bismuth fetch --did did:plc:ofrbh253gwicbkc5nktqepol --rkey 3mfyq5mpohw25 --output-dir ./posts
`
