/**
 * Threads export parser.
 *
 * Meta's data export for Threads is limited. This parser handles
 * whatever JSON structure is available.
 */

import type { ThreadsPost, ConvertResult, MicroblogPost } from './types.js';
import { truncateForAtProto } from './utils.js';

export function convertThreads(data: unknown): ConvertResult {
  const threadPosts = Array.isArray(data) ? (data as ThreadsPost[]) : [];
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const post of threadPosts) {
    try {
      const text = post.text?.trim();
      if (!text) {
        skipped++;
        continue;
      }

      const { text: finalText, truncated } = truncateForAtProto(text);

      const result: MicroblogPost = {
        text: finalText,
        createdAt: post.timestamp,
        platform: 'threads',
        originalId: post.id,
        truncated,
        mediaUris: post.media?.map((m) => m.uri),
        replyTo: post.parent_id ? `threads:${post.parent_id}` : undefined,
        quoteUri: post.quote_id ? `threads:${post.quote_id}` : undefined,
      };

      posts.push(result);
    } catch (err) {
      errors.push(`Threads post ${post.id}: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
