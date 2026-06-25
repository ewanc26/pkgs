/**
 * CLI for @ewanc26/opal.
 *
 * Usage:
 *   opal --source <platform> --input <file> [--output <file>] [--publish] [--dry-run]
 *   opal --source <platform> --input <file> --publish --handle <handle> --password <app-password>
 */

import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { convertData, parseTwitterArchive } from './convert.js';
import { publishRecords } from './publisher.js';
import type { ConvertOptions, Platform } from './types.js';

const VALID_SOURCES: Platform[] = ['twitter', 'mastodon', 'threads', 'nostr'];

interface CliArgs extends Partial<ConvertOptions> {
  help?: boolean;
  handle?: string;
  password?: string;
}

function parseArgs(argv: string[]): CliArgs {
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
  mastodon   Mastodon outbox (outbox.json)
  threads    Threads export (JSON)
  nostr      Nostr events (JSON array)

Options:
  --source <platform>   Source platform (required)
  --input <file>        Input file path (required)
  --output <file>       Write converted JSON to file
  --publish             Publish to AT Protocol after conversion
  --handle <handle>     AT Protocol handle or DID (required for --publish)
  --password <password> App password (required for --publish)
  --dry-run             Show what would be published without publishing
  -h, --help            Show this help message

Examples:
  opal --source twitter --input tweets.js --output posts.json
  opal --source mastodon --input outbox.json --publish --handle alice.bsky.social --password xxxx-xxxx-xxxx-xxxx
  opal --source nostr --input events.json --publish --dry-run --handle alice.bsky.social --password xxxx-xxxx-xxxx-xxxx
`.trim());
}

async function login(handle: string, password: string) {
  // Dynamic import so @atproto/api is only loaded when publishing
  const { Agent } = await import('@atproto/api');
  const agent = new Agent({ service: 'https://bsky.social' });

  console.log(`Logging in as ${handle}…`);
  await agent.login({ identifier: handle, password });

  const did = agent.session?.did ?? 'unknown';
  console.log(`  DID: ${did}`);
  return agent;
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

  if (args.publish && (!args.handle || !args.password)) {
    console.error('Error: --handle and --password are required when using --publish');
    console.error('  Use --handle <your.handle> --password <app-password>');
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

  // Read and parse the input file
  const raw = await readFile(opts.input, 'utf-8');
  const data = opts.source === 'twitter'
    ? parseTwitterArchive(raw)
    : JSON.parse(raw);

  const result = convertData(opts.source, data);

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
    if (result.posts.length === 0) {
      console.log('\nNo posts to publish.');
      return;
    }

    console.log(`\nPublishing ${result.posts.length} post(s) to Bluesky…`);

    let cancelled = false;
    const onSigInt = () => {
      console.log('\nGracefully stopping… (press Ctrl+C again to force)');
      cancelled = true;
      process.once('SIGINT', () => {
        console.log('Force quit.');
        process.exit(1);
      });
    };
    process.once('SIGINT', onSigInt);

    try {
      const agent = await login(args.handle!, args.password!);

      const pubResult = await publishRecords(
        agent,
        result.posts,
        opts.dryRun ?? false,
        {
          onProgress: (p) => {
            const pct = Math.round((p.recordsProcessed / p.totalRecords) * 100);
            process.stdout.write(`\r  ${pct}% — ${p.recordsProcessed}/${p.totalRecords} — ${p.successCount} ok, ${p.errorCount} failed`);
          },
          onLog: (level, msg) => {
            // Only show non-progress logs
            if (level !== 'progress') {
              process.stdout.write(`\n  [${level}] ${msg}`);
            }
          },
          isCancelled: () => cancelled,
        },
      );

      process.stdout.write('\n');
      console.log(`\nDone! ${pubResult.successCount} post(s) published.`);
      if (pubResult.errorCount > 0) {
        console.log(`${pubResult.errorCount} post(s) failed.`);
      }
      if (pubResult.cancelled) {
        console.log('Import was cancelled.');
      }
    } catch (err: any) {
      process.stdout.write('\n');
      console.error(`\nPublishing failed: ${err.message || err}`);
      process.exit(1);
    } finally {
      process.removeListener('SIGINT', onSigInt);
    }
  }
}
