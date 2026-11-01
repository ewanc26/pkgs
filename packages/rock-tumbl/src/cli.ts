/**
 * rock-tumbl CLI
 *
 * Converts a Tumblr blog export into site.standard.document values, with an
 * optional dry-run preview and authenticated publishing to Standard.site.
 *
 * Usage:
 *   rock-tumbl --input <archive.zip|export-dir> --site <site-url> [options]
 *
 * Examples:
 *   rock-tumbl --input export.zip --site https://myblog.croft.click --dry-run
 *   rock-tumbl --input export.zip --site https://myblog.croft.click --publish \
 *       --handle you.bsky.social --password app-password
 */

import { parseArgs } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { detectLayout, parseArchive } from './archive.js'
import { convertArchive, validateSite } from './convert.js'
import { StandardSitePublisher } from './publisher.js'
import type { ConvertOptions } from './types.js'

interface CliArgs {
  help?: boolean
  input?: string
  site?: string
  output?: string
  publish?: boolean
  dryRun?: boolean
  includePrivate?: boolean
  handle?: string
  password?: string
  service?: string
  nonInteractive?: boolean
  version?: boolean
}

const PKG_VERSION = '0.1.0'

function parseCliArgs(argv: string[]): CliArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      input: { type: 'string', short: 'i' },
      site: { type: 'string', short: 's' },
      output: { type: 'string', short: 'o' },
      publish: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'include-private': { type: 'boolean', default: false },
      handle: { type: 'string' },
      password: { type: 'string' },
      service: { type: 'string' },
      'non-interactive': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', default: false },
    },
    allowPositionals: false,
    strict: true,
  })
  return {
    input: values.input as string | undefined,
    site: values.site as string | undefined,
    output: values.output as string | undefined,
    publish: values.publish as boolean,
    dryRun: values['dry-run'] as boolean,
    includePrivate: values['include-private'] as boolean,
    handle: values.handle as string | undefined,
    password: values.password as string | undefined,
    service: values.service as string | undefined,
    nonInteractive: values['non-interactive'] as boolean,
    help: values.help as boolean,
    version: values.version as boolean,
  }
}

function printHelp(): void {
  console.log(`
rock-tumbl — Convert Tumblr exports to Standard.site documents

Usage:
  rock-tumbl --input <archive.zip|export-dir> --site <site-url> [options]

Arguments:
  --input, -i  Path to a Tumblr export ZIP or extracted directory (required)
  --site, -s   Standard.site publication URL used as the document site (required)

Options:
  --output, -o FILE     Write converted documents as JSON to FILE
  --publish             Publish documents to Standard.site after conversion
  --dry-run             Preview what would be published without publishing
  --include-private     Include private/draft posts (excluded by default)
  --handle HANDLE       AT Protocol handle (required for --publish)
  --password PASS       App password (required for --publish)
  --service URL         PDS override (default: https://bsky.social)
  --non-interactive     Accepted for consistency; rock-tumbl never prompts
  -h, --help            Show this help message
  --version             Print version and exit

Examples:
  rock-tumbl --input export.zip --site https://blog.example.com --dry-run
  rock-tumbl --input export/ --site https://blog.example.com --output posts.json
  rock-tumbl --input export.zip --site https://blog.example.com --publish \
    --handle you.bsky.social --password app-password
`.trim())
}

export async function runCLI(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseCliArgs(argv)

  if (args.version) {
    console.log(PKG_VERSION)
    return
  }

  if (args.help) {
    printHelp()
    return
  }

  if (!args.input || !args.site) {
    console.error('Error: --input and --site are required')
    printHelp()
    process.exit(1)
  }

  validateSite(args.site)

  if (args.publish && (!args.handle || !args.password)) {
    console.error('Error: --handle and --password are required when using --publish')
    process.exit(1)
  }

  const convertOptions: ConvertOptions = {
    site: args.site,
    includePrivate: args.includePrivate,
  }

  console.log(`rock-tumbl — scanning ${args.input}…`)
  const detection = await detectLayout(args.input)
  console.log(`  Layout:   ${detection.layout}`)
  console.log(`  Entries:  ${detection.entryCount}`)
  if (detection.hasMedia) console.log('  Media:    present')

  const archive = await parseArchive(args.input, { includePrivate: args.includePrivate })
  console.log(`  Posts:    ${archive.posts.length}`)
  if (archive.warnings.length) {
    console.log(`  Warnings: ${archive.warnings.length}`)
    for (const w of archive.warnings.slice(0, 5)) console.log(`    - ${w}`)
  }

  const result = convertArchive(archive.posts, convertOptions)
  console.log(`  Converted: ${result.documents.length}`)
  console.log(`  Skipped:   ${result.skipped}`)
  if (result.errors.length) {
    console.log(`  Errors:    ${result.errors.length}`)
    for (const e of result.errors.slice(0, 5)) console.log(`    - ${e.message}`)
  }
  if (result.warnings.length) {
    console.log(`  Warn:      ${result.warnings.length}`)
    for (const w of result.warnings.slice(0, 5)) console.log(`    - ${w}`)
  }

  if (args.output) {
    await writeFile(args.output, JSON.stringify(result.documents, null, 2), 'utf-8')
    console.log(`  Output:    ${args.output}`)
  }

  if (args.publish) {
    if (result.documents.length === 0) {
      console.log('\nNo documents to publish.')
      return
    }
    console.log(`\nPublishing ${result.documents.length} document(s) to ${args.site}…`)

    const publisher = new StandardSitePublisher({
      handle: args.handle!,
      password: args.password!,
      service: args.service,
      onLog: (level, msg) => console.log(`  [${level}] ${msg}`),
    })
    await publisher.login()

    let published = 0
    let failed = 0
    for (const doc of result.documents) {
      try {
        await publisher.publishDocument(doc, args.dryRun ?? false)
        published++
      } catch (err: any) {
        failed++
        console.error(`  [error] Failed to publish "${doc.title}": ${err.message ?? err}`)
      }
    }

    console.log(`\nDone! ${published} published${failed ? `, ${failed} failed` : ''}.`)
    if (args.dryRun) console.log('(dry run — no records were written)')
  }
}
