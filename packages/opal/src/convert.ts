/**
 * Main conversion dispatcher — delegates to the correct platform parser
 * and runs post-processing (thread splitting).
 *
 * This module has no Node.js dependencies and is safe for browser use.
 */

import type { ConvertResult, MicroblogPost, Platform } from './types.js';
import { convertTwitter } from './twitter.js';
import { convertMastodon } from './mastodon.js';
import { convertThreads } from './threads.js';
import { convertNostr } from './nostr.js';
import { splitToThread } from './utils.js';

const parsers: Record<Platform, (data: unknown) => ConvertResult> = {
  twitter: convertTwitter,
  mastodon: convertMastodon,
  threads: convertThreads,
  nostr: convertNostr,
};

/**
 * Convert pre-parsed platform data to normalised MicroblogPost[].
 * Long posts (>300 graphemes) are automatically split into Bluesky threads.
 *
 * For Twitter archives, the caller must extract the JSON array from the
 * JS wrapper before passing it here. Use `parseTwitterArchive()` from
 * the CLI module for that.
 */
export function convertData(source: Platform, data: unknown): ConvertResult {
  const parser = parsers[source];
  const result = parser(data);
  return splitLongPosts(result);
}

/**
 * Post-process conversion results: split any post exceeding 300 graphemes
 * into a Bluesky thread (multiple posts linked by replyTo/threadRoot).
 */
function splitLongPosts(result: ConvertResult): ConvertResult {
  const posts: MicroblogPost[] = [];

  for (const post of result.posts) {
    posts.push(...splitToThread(post));
  }

  return {
    posts,
    skipped: result.skipped,
    errors: result.errors,
  };
}

/**
 * Pre-process raw Twitter archive content.
 * Twitter archives wrap data in `window.YTD.tweets.part0 = [...]`
 * which isn't valid JSON on its own.
 */
export function parseTwitterArchive(raw: string): unknown {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error('Could not extract tweet array from Twitter archive file');
  }
  return JSON.parse(match[0]);
}

export { convertTwitter } from './twitter.js';
export { convertMastodon } from './mastodon.js';
export { convertThreads } from './threads.js';
export { convertNostr } from './nostr.js';
