/**
 * Nostr event parser.
 *
 * Parses an array of Nostr events (kind 1 = text notes).
 * Events are typically exported from a Nostr client as a JSON array.
 */

import type { NostrEvent, ConvertResult, MicroblogPost, Facet } from './types.js';
import { parseUnixTimestamp, truncateForAtProto, linkFacet, tagFacet } from './utils.js';

export function convertNostr(data: unknown): ConvertResult {
  const events = Array.isArray(data) ? (data as NostrEvent[]) : [];
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const event of events) {
    try {
      // Only process text notes (kind 1)
      if (event.kind !== 1) {
        continue;
      }

      const text = event.content?.trim();
      if (!text) {
        skipped++;
        continue;
      }

      const facets: Facet[] = [];

      // Parse tags for reply and quote references
      let replyTo: string | undefined;
      let quoteUri: string | undefined;

      for (const tag of event.tags) {
        // ["e", "<event-id>", "<relay-url>", "<marker>"]
        if (tag[0] === 'e' && tag.length >= 4) {
          const marker = tag[3];
          if (marker === 'reply' || marker === 'root') {
            replyTo = `nostr:${tag[1]}`;
          } else if (marker === 'mention') {
            quoteUri = `nostr:${tag[1]}`;
          }
        }

        // ["t", "<hashtag>"]
        if (tag[0] === 't' && tag[1]) {
          const tagName = tag[1].startsWith('#') ? tag[1] : `#${tag[1]}`;
          const charIndex = text.indexOf(tagName);
          if (charIndex !== -1) {
            facets.push(tagFacet(text, charIndex, charIndex + tagName.length, tag[1]));
          }
        }

        // ["r", "<url>"]
        if (tag[0] === 'r' && tag[1]) {
          const url = tag[1];
          const charIndex = text.indexOf(url);
          if (charIndex !== -1) {
            facets.push(linkFacet(text, charIndex, charIndex + url.length, url));
          }
        }
      }

      const { text: finalText, truncated } = truncateForAtProto(text);

      const post: MicroblogPost = {
        text: finalText,
        createdAt: parseUnixTimestamp(event.created_at),
        platform: 'nostr',
        originalId: event.id,
        originalUrl: `nostr:nevent1${event.id}`,
        facets: facets.length > 0 ? facets : undefined,
        truncated,
        replyTo,
        quoteUri,
      };

      posts.push(post);
    } catch (err) {
      errors.push(`Nostr event ${event.id}: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
