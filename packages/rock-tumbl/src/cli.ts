/**
 * rock-tumbl CLI
 *
 * Converts a Tumblr blog export into site.standard.document values, with an
 * optional dry-run preview and authenticated publishing to Standard.site.
 *
 * Usage:
 *   rock-tumbl --input <archive.zip|export-dir> --site <publication-url|at-uri> [options]
 *
 * Examples:
 *   rock-tumbl --input export.zip --site https://myblog.croft.click --dry-run
 *   rock-tumbl --input export.zip --site https://myblog.croft.click --publish \
 *       --handle you.bsky.social --password app-password
 *   rock-tumbl --input export.zip --site https://myblog.croft.click \
 *       --publish --create-publication --publication-name "My Tumblr archive" \
 *       --upload-media --handle you.bsky.social --password app-password
 */

import { parseArgs } from 'node:util'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { detectLayout, parseArchive } from './archive.js'
import { convertArchive, validateSite } from './convert.js'
import { rewriteMediaReferences, uploadArchiveMedia } from './media.js'
import { normalizePublicationUrl, publicationWellKnownBody, publicationWellKnownPath } from './publication.js'
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
  createPublication?: boolean
  publicationName?: string
  publicationDescription?: string
  wellKnownOut?: string
  uploadMedia?: boolean
  maxMediaBytes?: string
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
      'create-publication': { type: 'boolean', default: false },
      'publication-name': { type: 'string' },
      'publication-description': { type: 'string' },
      'well-known-out': { type: 'string' },
      'upload-media': { type: 'boolean', default: false },
      'max-media-bytes': { type: 'string' },
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
    createPublication: values['create-publication'] as boolean,
    publicationName: values['publication-name'] as string | undefined,
    publicationDescription: values['publication-description'] as string | undefined,
    wellKnownOut: values['well-known-out'] as string | undefined,
    uploadMedia: values['upload-media'] as boolean,
    maxMediaBytes: values['max-media-bytes'] as string | undefined,
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
  rock-tumbl --input <archive.zip|export-dir> --site <publication-url|at-uri> [options]

Arguments:
  --input, -i  Path to a Tumblr export ZIP or extracted directory (required)
  --site, -s   Publication URL, or an existing publication AT URI, used as the
               document site (required)

Publication options:
  --create-publication          Create a new site.standard.publication record
                                using --site as its URL (requires --publish)
  --publication-name NAME       Publication name (required with
                                --create-publication)
  --publication-description TXT  Publication description
  --well-known-out FILE         Write the .well-known verification body to FILE
  --upload-media                Upload referenced local media to the PDS and
                                rewrite document links (requires --publish)
  --max-media-bytes N           Skip media files larger than N bytes
                                (default: 5242880, i.e. 5 MiB)

Options:
  --output, -o FILE     Write converted documents as JSON to FILE
  --publish             Publish documents to Standard.site after conversion
  --dry-run             Preview what would be published without writing records
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
  rock-tumbl --input export.zip --site https://blog.example.com --publish \\
    --create-publication --publication-name "My blog" --upload-media \\
    --handle you.bsky.social --password app-password
  rock-tumbl --input export.zip \\
    --site at://did:plc:abc123/site.standard.publication/3abc --publish \\
    --handle you.bsky.social --password app-password
`.trim())
}

function fail(message: string): never {
  console.error(`Error: ${message}`)
  process.exit(1)
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

  if (args.createPublication) {
    if (!args.publish) fail('--create-publication requires --publish')
    if (!args.publicationName) fail('--publication-name is required with --create-publication')
    if (args.site.startsWith('at://')) {
      fail('--site must be the publication URL when using --create-publication')
    }
  }

  if (args.uploadMedia && !args.publish) fail('--upload-media requires --publish')
  if (args.publish && (!args.handle || !args.password)) {
    fail('--handle and --password are required when using --publish')
  }

  let maxMediaBytes: number | undefined
  if (args.maxMediaBytes !== undefined) {
    const parsed = Number(args.maxMediaBytes)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      fail('--max-media-bytes must be a positive integer')
    }
    maxMediaBytes = parsed
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

  if (archive.posts.length === 0) {
    console.log('\nNo posts to import.')
    return
  }

  let documentSite = args.site
  let publisher: StandardSitePublisher | undefined

  if (args.publish) {
    publisher = new StandardSitePublisher({
      handle: args.handle!,
      password: args.password!,
      service: args.service,
      onLog: (level, msg) => console.log(`  [${level}] ${msg}`),
    })
    await publisher.login()

    if (args.createPublication) {
      const publication = await publisher.createPublication(
        {
          url: normalizePublicationUrl(args.site),
          name: args.publicationName!,
          description: args.publicationDescription,
        },
        args.dryRun ?? false,
      )
      documentSite = publication.uri

      const wellKnownPath = publicationWellKnownPath(args.site)
      const wellKnownBody = publicationWellKnownBody(publication.uri)
      console.log(`\nPublication: ${publication.uri}`)
      console.log(`Verify ${normalizePublicationUrl(args.site)} by serving ${wellKnownPath}:`)
      console.log(wellKnownBody.trimEnd())

      if (args.wellKnownOut) {
        await mkdir(dirname(args.wellKnownOut), { recursive: true })
        await writeFile(args.wellKnownOut, wellKnownBody, 'utf-8')
        console.log(`  Wrote verification body to ${args.wellKnownOut}`)
      }
    }

    if (args.uploadMedia) {
      if (args.dryRun) {
        console.log('\n[DRY RUN] Skipping media uploads; document links stay relative.')
      } else {
        console.log(`\nUploading media referenced by ${archive.posts.length} post(s)…`)
        const media = await uploadArchiveMedia(publisher, args.input, archive.posts, {
          maxBytes: maxMediaBytes,
          onLog: (level, msg) => console.log(`  [${level}] ${msg}`),
          onProgress: (done, total) => {
            if (done === total || done % 25 === 0) {
              console.log(`  Media:    ${done}/${total} processed`)
            }
          },
        })
        console.log(`  Uploaded: ${media.uploaded} (${media.bytes} bytes)`)
        if (media.skipped) console.log(`  Skipped:  ${media.skipped} (too large)`)
        if (media.failed) console.log(`  Failed:   ${media.failed}`)
        for (const post of archive.posts) {
          if (post.body) post.body = rewriteMediaReferences(post.body, media.urlByPath)
        }
      }
    }
  }

  const convertOptions: ConvertOptions = {
    site: documentSite,
    includePrivate: args.includePrivate,
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
    console.log(`\nPublishing ${result.documents.length} document(s) to ${documentSite}…`)

    let published = 0
    let failed = 0
    for (const doc of result.documents) {
      try {
        await publisher!.publishDocument(doc, args.dryRun ?? false)
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
