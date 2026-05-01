/**
 * CLI for @ewanc26/opal.
 *
 * Usage:
 *   opal --source <platform> --input <file> [--output <file>] [--publish] [--dry-run]
 */

import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { convert } from './convert.js';
import type { ConvertOptions, Platform } from './types.js';

const VALID_SOURCES: Platform[] = ['twitter', 'mastodon', 'threads', 'nostr'];

function parseArgs(argv: string[]): Partial<ConvertOptions> & { help?: boolean } {
  const opts: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      return { help: true };
    }
    if (arg === '--dry-run') {
      opts.dryRun = true;
      continue;
    }
    if (arg === '--publish') {
      opts.publish = true;
      continue;
    }
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2);
      opts[key] = argv[++i];
    }
  }
  return opts as any;
}

function printHelp(): void {
  console.log(`
opal — Convert microblog posts to AT Protocol Bluesky posts

Usage:
  opal --source <platform> --input <file> [options]

Platforms:
  twitter    Twitter/X archive (tweets.js)
  mastodon  Mastodon outbox (outbox.json)
  threads   Threads export (JSON)
  nostr     Nostr events (JSON array)

Options:
  --source <platform>  Source platform (required)
  --input <file>       Input file path (required)
  --output <file>      Write converted JSON to file
  --publish            Publish to AT Protocol after conversion
  --dry-run            Show what would be published without publishing
  -h, --help           Show this help message

Examples:
  opal --source twitter --input tweets.js --output posts.json
  opal --source mastodon --input outbox.json --publish
  opal --source nostr --input events.json --publish --dry-run
`.trim());
}

export async function runCLI(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.source || !args.input) {
    console.error('Error: --source and --input are required');
    printHelp();
    process.exit(1);
  }

  if (!VALID_SOURCES.includes(args.source as Platform)) {
    console.error(`Error: invalid source "${args.source}". Must be one of: ${VALID_SOURCES.join(', ')}`);
    process.exit(1);
  }

  const opts: ConvertOptions = {
    source: args.source as Platform,
    input: resolve(args.input),
    output: args.output ? resolve(args.output) : undefined,
    publish: args.publish ?? false,
    dryRun: args.dryRun ?? false,
  };

  console.log(`Opal — converting ${opts.source} export…`);
  console.log(`  Input:  ${opts.input}`);

  const result = await convert(opts);

  console.log(`  Posts:   ${result.posts.length}`);
  console.log(`  Skipped: ${result.skipped}`);

  if (result.errors.length > 0) {
    console.log(`  Errors:  ${result.errors.length}`);
    for (const err of result.errors.slice(0, 5)) {
      console.log(`    - ${err}`);
    }
    if (result.errors.length > 5) {
      console.log(`    …and ${result.errors.length - 5} more`);
    }
  }

  if (opts.output) {
    await writeFile(opts.output, JSON.stringify(result, null, 2));
    console.log(`  Output:  ${opts.output}`);
  }

  if (opts.publish) {
    console.log('\nPublishing is not yet implemented in the CLI.');
    console.log('Use opal-web for browser-based publishing, or pipe the JSON output to your own tool.');
  }
}
