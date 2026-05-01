/**
 * Threads export parser.
 *
 * Meta doesn't publish a schema for Threads exports. The format is
 * Instagram-archive-shaped: posts use `title` for text and
 * `creation_timestamp` (Unix seconds) for timestamps.
 *
 * This parser handles both the documented Instagram-style format and
 * any alternative field names that may appear.
 */

import type { ThreadsPost, ConvertResult, MicroblogPost } from './types.js';
import { truncateForAtProto, parseUnixTimestamp } from './utils.js';

export function convertThreads(data: unknown): ConvertResult {
  const threadPosts = Array.isArray(data) ? (data as ThreadsPost[]) : [];
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const post of threadPosts) {
    try {
      // Threads uses `title` for post text, fallback to `text`
      const text = (post.title ?? post.text)?.trim();
      if (!text) {
        skipped++;
        continue;
      }

      // Threads uses `creation_timestamp` (Unix seconds), fallback to `timestamp` (ISO 8601)
      let createdAt: string;
      if (post.creation_timestamp != null) {
        createdAt = parseUnixTimestamp(post.creation_timestamp);
      } else if (post.timestamp) {
        createdAt = post.timestamp; // Already ISO 8601
      } else {
        skipped++;
        continue;
      }

      const { text: finalText, truncated } = truncateForAtProto(text);

      // Regex-detect hashtags in text (Threads export doesn't include structured entity data)
      const hashtagRegex = /#(\w+)/g;
      const facets: MicroblogPost['facets'] = [];
      let match: RegExpExecArray | null;
      while ((match = hashtagRegex.exec(finalText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const { byteStart, byteEnd } = {
          byteStart: new TextEncoder().encode([...finalText].slice(0, start).join('')).byteLength,
          byteEnd: new TextEncoder().encode([...finalText].slice(0, end).join('')).byteLength,
        };
        facets!.push({
          index: { byteStart, byteEnd },
          features: [{ $type: 'app.bsky.richtext.facet#tag', tag: match[1] }],
        });
      }

      const result: MicroblogPost = {
        text: finalText,
        createdAt,
        platform: 'threads',
        originalId: post.id ?? `threads-${post.creation_timestamp}`,
        truncated,
        mediaUris: post.media?.map((m) => m.uri),
        mediaAlt: post.media?.map((m) => m.title ?? ''),
        replyTo: post.parent_id ? `threads:${post.parent_id}` : undefined,
        quoteUri: post.quote_id ? `threads:${post.quote_id}` : undefined,
        facets: facets && facets.length > 0 ? facets : undefined,
      };

      posts.push(result);
    } catch (err) {
      errors.push(`Threads post: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
