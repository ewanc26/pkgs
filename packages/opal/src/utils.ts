/**
 * Shared utility functions for @ewanc26/opal.
 */

import type { Facet, ByteSlice } from './types.js';

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
