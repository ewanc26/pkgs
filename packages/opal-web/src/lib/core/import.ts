/**
 * Import orchestration logic — pure TypeScript, no Svelte deps.
 * Handles the conversion + publishing flow with progress + cancellation callbacks.
 */

import type { Agent } from '@atproto/api';
import type { Platform, MicroblogPost, ConvertResult } from '@ewanc26/opal';
import { convertTwitter, convertMastodon, convertThreads, convertNostr, publishRecords, splitToThread } from '@ewanc26/opal';

export interface ImportResult {
  success: number;
  errors: number;
  cancelled: boolean;
}

export interface ImportCallbacks {
  onLog: (level: 'info' | 'success' | 'warn' | 'error' | 'progress', message: string) => void;
  onProgress: (p: { recordsProcessed: number; totalRecords: number; successCount: number; errorCount: number; message: string }) => void;
  isCancelled: () => boolean;
}

/**
 * Parse an export file for the given platform.
 * Long posts are automatically split into Bluesky threads.
 */
export async function parseExport(
  file: File,
  platform: Platform,
): Promise<ConvertResult> {
  const text = await file.text();
  let data: unknown;

  if (platform === 'twitter') {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Could not extract tweet array from Twitter archive');
    data = JSON.parse(match[0]);
  } else {
    data = JSON.parse(text);
  }

  const parsers: Record<Platform, (data: unknown) => ConvertResult> = {
    twitter: convertTwitter,
    mastodon: convertMastodon,
    threads: convertThreads,
    nostr: convertNostr,
  };

  const result = parsers[platform](data);

  // Split long posts into threads
  const posts: MicroblogPost[] = [];
  for (const post of result.posts) {
    posts.push(...splitToThread(post));
  }

  return { posts, skipped: result.skipped, errors: result.errors };
}

/**
 * Full import flow: parse → publish.
 */
export async function runImport(
  agent: Agent,
  posts: MicroblogPost[],
  dryRun: boolean,
  { onLog, onProgress, isCancelled }: ImportCallbacks,
): Promise<ImportResult> {
  onLog('info', `Publishing ${posts.length.toLocaleString()} posts to ATProto…`);

  const res = await publishRecords(agent, posts, dryRun, {
    onProgress,
    onLog,
    isCancelled,
  });

  return {
    success: res.successCount,
    errors: res.errorCount,
    cancelled: res.cancelled,
  };
}
