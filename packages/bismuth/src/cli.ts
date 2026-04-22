/**
 * bismuth CLI
 *
 * Converts ATProto RTF-block documents to Markdown.
 * Supports pub.leaflet.content, site.standard.document,
 * blog.pckt.content, and app.offprint.content.
 *
 * Usage:
 *   bismuth [options] [file]
 *
 *   file    Path to a JSON file containing the document. Reads stdin if omitted.
 *
 * Options:
 *   -f, --frontmatter   Emit YAML front matter from document metadata.
 *   -p, --page-break    String used to separate pages (default: "\\n\\n---\\n\\n").
 *       --did           Source DID for Pckt blob resolution.
 *   -o, --output        Write output to a file instead of stdout.
 *   -h, --help          Show this help text and exit.
 *       --version       Print version and exit.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { parseArgs } from 'node:util'
import {
  documentToMarkdown,
  contentToMarkdown,
  pcktContentToMarkdown,
  offprintContentToMarkdown,
} from './convert.js'
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

Arguments:
  file                  JSON file to read. Reads stdin if omitted.

Options:
  -f, --frontmatter     Emit YAML front matter from document metadata.
  -p, --page-break STR  Separator between pages (default: "\\n\\n---\\n\\n").
      --did DID         Source DID for Pckt blob resolution.
  -o, --output FILE     Write output to FILE instead of stdout.
  -h, --help            Show this help text and exit.
      --version         Print version and exit.

Examples:
  # Convert a Standard.site document, with front matter
  bismuth --frontmatter doc.json

  # Pipe from another command
  cat doc.json | bismuth --frontmatter > post.md

  # Pckt content with blob resolution
  bismuth --did did:plc:abc123 pckt-post.json

  # Multi-page Leaflet document — custom page separator
  bismuth --page-break 
\\n\\n<!-- page -->\\n\\n' doc.json
`
