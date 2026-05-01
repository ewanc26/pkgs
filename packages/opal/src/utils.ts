/**
 * Shared utility functions for @ewanc26/opal.
 */

import type { Facet, ByteSlice, MicroblogPost } from './types.js';

/** Maximum grapheme count for an AT Protocol post */
export const MAX_GRAPHEME_COUNT = 300;

/**
 * Strip HTML tags and decode common entities.
 * Used for Mastodon content which arrives as HTML.
 */
export function stripHtml(html: string): string {
  return html
    // Replace <br> and <br/> with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace </p> with newlines
    .replace(/<\/p>/gi, '\n')
    // Remove all other HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Count graphemes in a string (Unicode-aware).
 * Uses Intl.Segmenter where available, falls back to [...spread].
 */
export function countGraphemes(text: string): number {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].length;
  }
  return [...text].length;
}

/**
 * Truncate text to fit within the AT Protocol grapheme limit.
 * If the text is too long, truncates and appends an ellipsis.
 * Returns the truncated text and whether truncation occurred.
 *
 * @deprecated Use splitToThread() instead — it threads long posts rather than truncating.
 */
export function truncateForAtProto(text: string): { text: string; truncated: boolean } {
  const count = countGraphemes(text);
  if (count <= MAX_GRAPHEME_COUNT) {
    return { text, truncated: false };
  }

  // Truncate with ellipsis — leave room for "…"
  const target = MAX_GRAPHEME_COUNT - 1;
  const chars = [...text];
  return {
    text: chars.slice(0, target).join('') + '…',
    truncated: true,
  };
}

/**
 * Split text into chunks that fit within the AT Protocol grapheme limit.
 * Prefers splitting at word boundaries. Returns an array of text chunks.
 * Each chunk is at most MAX_GRAPHEME_COUNT graphemes.
 */
export function splitTextToChunks(text: string): string[] {
  const graphemeCount = countGraphemes(text);
  if (graphemeCount <= MAX_GRAPHEME_COUNT) {
    return [text];
  }

  const chunks: string[] = [];
  const graphemes = [...text];
  let remaining = graphemes;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_GRAPHEME_COUNT) {
      chunks.push(remaining.join(''));
      break;
    }

    // Find a split point near the limit, preferring word boundaries
    let splitAt = MAX_GRAPHEME_COUNT;

    // Search backwards from the limit for a word boundary
    for (let i = MAX_GRAPHEME_COUNT - 1; i > MAX_GRAPHEME_COUNT * 0.6; i--) {
      const char = remaining[i];
      if (char === ' ' || char === '\n' || char === '\t') {
        splitAt = i;
        break;
      }
    }

    // If no word boundary found, split at the hard limit
    chunks.push(remaining.slice(0, splitAt).join(''));
    remaining = remaining.slice(splitAt);
  }

  return chunks;
}

/**
 * Split a long post into a Bluesky thread.
 * Each chunk becomes a MicroblogPost with replyTo/threadRoot pointing
 * to the previous chunk. Media, facets, and quote embeds attach to
 * the first chunk only.
 */
export function splitToThread(post: MicroblogPost): MicroblogPost[] {
  const graphemeCount = countGraphemes(post.text);
  if (graphemeCount <= MAX_GRAPHEME_COUNT) {
    return [post];
  }

  const chunks = splitTextToChunks(post.text);
  const total = chunks.length;
  const posts: MicroblogPost[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const isFirst = i === 0;

    // Recompute facets for this chunk's text
    // Only the first chunk inherits the original facets (adjusted for the chunk text)
    let facets: Facet[] | undefined;
    if (isFirst && post.facets) {
      // Filter facets that fall within this chunk's text
      const chunkBytes = new TextEncoder().encode(chunkText).byteLength;
      facets = post.facets.filter((f: Facet) => f.index.byteStart < chunkBytes);
    }

    const splitPost: MicroblogPost = {
      text: chunkText,
      createdAt: post.createdAt,
      platform: post.platform,
      originalId: `${post.originalId}-part${i + 1}`,
      originalUrl: isFirst ? post.originalUrl : undefined,
      facets,
      truncated: true,
      langs: post.langs,
      contentWarning: isFirst ? post.contentWarning : undefined,
      threadIndex: i + 1,
      threadTotal: total,
    };

    // Media only on the first post
    if (isFirst) {
      splitPost.mediaUris = post.mediaUris;
      splitPost.mediaAlt = post.mediaAlt;
      splitPost.mediaMimeTypes = post.mediaMimeTypes;
      splitPost.quoteUri = post.quoteUri;
    }

    // Threading: each chunk replies to the previous one
    if (!isFirst) {
      // Use a synthetic internal reference that the publisher resolves
      // Format: opal-internal:<originalId>-part<N>
      splitPost.replyTo = `opal-internal:${post.originalId}-part${i}`;
      splitPost.threadRoot = `opal-internal:${post.originalId}-part1`;
    }

    // If the original post was a reply, the first chunk inherits that
    if (isFirst && post.replyTo) {
      splitPost.replyTo = post.replyTo;
      splitPost.threadRoot = post.threadRoot ?? post.replyTo;
    }

    posts.push(splitPost);
  }

  return posts;
}

/**
 * Convert a Twitter timestamp ("Tue Jun 15 20:32:00 +0000 2021") to ISO 8601.
 */
export function parseTwitterTimestamp(ts: string): string {
  // Twitter format: "Day Mon DD HH:MM:SS +ZZZZ YYYY"
  const date = new Date(ts);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid Twitter timestamp: ${ts}`);
  }
  return date.toISOString();
}

/**
 * Convert a Unix timestamp (Nostr) to ISO 8601.
 */
export function parseUnixTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

/**
 * Build a Twitter web URL from a tweet ID and username.
 */
export function twitterUrl(username: string, id: string): string {
  return `https://x.com/${username}/status/${id}`;
}

/**
 * Build a Mastodon web URL from a status ID and instance.
 */
export function mastodonUrl(instance: string, id: string): string {
  return `https://${instance}/status/${id}`;
}

/**
 * Compute UTF-8 byte offsets for a facet.
 * AT Protocol facets use byte offsets, not character offsets.
 */
export function textToByteSlice(text: string, startChar: number, endChar: number): ByteSlice {
  const encoder = new TextEncoder();
  const before = [...text].slice(0, startChar).join('');
  const match = [...text].slice(startChar, endChar).join('');
  return {
    byteStart: encoder.encode(before).byteLength,
    byteEnd: encoder.encode(before + match).byteLength,
  };
}

/**
 * Create a link facet at the given character range.
 */
export function linkFacet(text: string, startChar: number, endChar: number, uri: string): Facet {
  return {
    index: textToByteSlice(text, startChar, endChar),
    features: [{ $type: 'app.bsky.richtext.facet#link', uri }],
  };
}

/**
 * Create a mention facet at the given character range.
 */
export function mentionFacet(text: string, startChar: number, endChar: number, did: string): Facet {
  return {
    index: textToByteSlice(text, startChar, endChar),
    features: [{ $type: 'app.bsky.richtext.facet#mention', did }],
  };
}

/**
 * Create a tag facet at the given character range.
 */
export function tagFacet(text: string, startChar: number, endChar: number, tag: string): Facet {
  return {
    index: textToByteSlice(text, startChar, endChar),
    features: [{ $type: 'app.bsky.richtext.facet#tag', tag }],
  };
}
