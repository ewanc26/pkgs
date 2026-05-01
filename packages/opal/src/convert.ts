/**
 * Main conversion dispatcher — reads input, delegates to the correct
 * platform parser, and returns a normalised ConvertResult.
 */

import { readFile } from 'node:fs/promises';
import type { ConvertOptions, ConvertResult, Platform } from './types.js';
import { convertTwitter } from './twitter.js';
import { convertMastodon } from './mastodon.js';
import { convertThreads } from './threads.js';
import { convertNostr } from './nostr.js';

const parsers: Record<Platform, (data: unknown) => ConvertResult> = {
  twitter: convertTwitter,
  mastodon: convertMastodon,
  threads: convertThreads,
  nostr: convertNostr,
};

/**
 * Parse a platform export file and convert to normalised MicroblogPost[].
 */
export async function convert(opts: ConvertOptions): Promise<ConvertResult> {
  const raw = await readFile(opts.input, 'utf-8');
  const data = parseRaw(raw, opts.source);
  const parser = parsers[opts.source];
  return parser(data);
}

/**
 * Pre-process raw file content before passing to the parser.
 * Twitter archives wrap data in `window.YTD.tweets.part0 = [...]`
 * which isn't valid JSON on its own.
 */
function parseRaw(raw: string, source: Platform): unknown {
  if (source === 'twitter') {
    // Twitter archives assign to a JS variable — extract the JSON array
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error('Could not extract tweet array from Twitter archive file');
    }
    return JSON.parse(match[0]);
  }

  return JSON.parse(raw);
}

export { convertTwitter } from './twitter.js';
export { convertMastodon } from './mastodon.js';
export { convertThreads } from './threads.js';
export { convertNostr } from './nostr.js';
