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
import { startTui, stopTui, exit, waitCallbacks } from '@ewanc26/tui/session';
import { askCredentials, runWizard } from './wizard.js';
import type { ConvertOptions, Platform } from './types.js';

const VALID_SOURCES: Platform[] = ['twitter', 'mastodon', 'threads', 'nostr'];

interface CliArgs extends Partial<ConvertOptions> {
  help?: boolean;
  handle?: string;
  password?: string;
  nonInteractive?: boolean;
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
    if (arg === '--no-tui') {
      continue; // read by the terminal detection
    }
    if (arg === '--publish') {
      opts.publish = true;
      continue;
    }
    if (arg === '--non-interactive') {
      opts.nonInteractive = true; // accepted for wrapper-script consistency; opal has no prompts
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
  --non-interactive     Never prompt; plain text output
  --no-tui              Plain text output instead of the terminal interface
  -h, --help            Show this help message

Run opal with no arguments in a terminal to be asked for everything.

Examples:
  opal --source twitter --input tweets.js --output posts.json
  opal --source mastodon --input outbox.json --publish --handle alice.bsky.social --password xxxx-xxxx-xxxx-xxxx
  opal --source nostr --input events.json --publish --dry-run --handle alice.bsky.social --password xxxx-xxxx-xxxx-xxxx
`.trim());
}

async function login(handle: string, password: string) {
  // Dynamic import so @atproto/lex is only loaded when publishing
  const { Client } = await import('@atproto/lex');
  const { PasswordSession } = await import('@atproto/lex-password-session');

  console.log(`Logging in as ${handle}…`);
  const session = await PasswordSession.login({
    service: 'https://bsky.social',
    identifier: handle,
    password,
  });

  const client = new Client(session, { service: 'https://bsky.social' as any });

  const did = client.assertDid ?? 'unknown';
  console.log(`  DID: ${did}`);
  return client;
}

export async function runCLI(): Promise<void> {
  const args: CliArgs & { preview?: boolean } = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  let publishing = false;
  const tui = await startTui({
    // While publishing, Ctrl+C stops after the batch in flight.
    onInterrupt: () => publishing && process.emit('SIGINT', 'SIGINT'),
  });
  const guided = Boolean(tui && !args.source && !args.input);
  if (tui && guided) {
    const answers = await runWizard(tui);
    Object.assign(args, answers, { dryRun: answers.preview });
  }

  if (!args.source || !args.input) {
    console.error('Error: --source and --input are required');
    printHelp();
    return exit(1);
  }

  if (!VALID_SOURCES.includes(args.source as Platform)) {
    console.error(`Error: invalid source "${args.source}". Must be one of: ${VALID_SOURCES.join(', ')}`);
    return exit(1);
  }

  if (args.publish && !args.preview && (!args.handle || !args.password) && tui) {
    Object.assign(args, await askCredentials(tui, args));
  }

  if (args.publish && !args.preview && (!args.handle || !args.password)) {
    console.error('Error: --handle and --password are required when using --publish');
    console.error('  Use --handle <your.handle> --password <app-password>');
    return exit(1);
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

    if (tui && guided && !args.preview) {
      const question = `Publish ${result.posts.length} post(s) to Bluesky as ${args.handle}?`;
      if (!(await tui.confirm(question, false))) {
        console.log('Nothing was published.');
        return stopTui();
      }
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
      tui?.status(args.preview ? 'Preparing preview…' : 'Signing in…');
      // A preview sends nothing, so it needs no session.
      const client = args.preview ? (null as never) : await login(args.handle!, args.password!);
      tui?.status(null);
      publishing = true;
      const countdown = waitCallbacks(() => cancelled);

      const pubResult = await publishRecords(
        client,
        result.posts,
        opts.dryRun ?? false,
        {
          onProgress: (p) => {
            if (tui) {
              tui.progress({ label: 'Publishing', done: p.recordsProcessed, total: p.totalRecords });
              if (p.waiting) countdown.onWait(p.waiting);
              return;
            }
            if (p.waiting) {
              const minutes = Math.ceil(p.waiting.remainingSeconds / 60);
              const at = new Date(p.waiting.resumeAt).toLocaleTimeString();
              process.stdout.write(`\n  waiting: resumes at ${at} (about ${minutes} min) — Ctrl+C to stop`);
              return;
            }
            const pct = Math.round((p.recordsProcessed / p.totalRecords) * 100);
            process.stdout.write(`\r  ${pct}% — ${p.recordsProcessed}/${p.totalRecords} — ${p.successCount} ok, ${p.errorCount} failed`);
          },
          onLog: (level, msg) => {
            // Only show non-progress logs
            if (level !== 'progress') {
              if (tui) console.log(`  [${level}] ${msg}`);
              else process.stdout.write(`\n  [${level}] ${msg}`);
            }
          },
          isCancelled: () => cancelled,
          retryNow: countdown.retryNow,
        },
      );

      publishing = false;
      tui?.progress(null);
      process.stdout.write('\n');
      console.log(
        args.preview
          ? `\nPreview only: ${pubResult.successCount} post(s) would be published.`
          : `\nDone! ${pubResult.successCount} post(s) published.`,
      );
      if (pubResult.errorCount > 0) {
        console.log(`${pubResult.errorCount} post(s) failed.`);
      }
      if (pubResult.cancelled) {
        console.log('Import was cancelled.');
      }
    } catch (err: any) {
      process.stdout.write('\n');
      console.error(`\nPublishing failed: ${err.message || err}`);
      return exit(1);
    } finally {
      process.removeListener('SIGINT', onSigInt);
    }
  }

  await stopTui();
}
