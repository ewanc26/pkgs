/**
 * Nostr event parser.
 *
 * Parses an array of Nostr events. Kind 1 = text notes, kind 6 = reposts
 * (skipped). Handles NIP-10 marked e tags, NIP-18 q tags, NIP-12 t tags,
 * NIP-27 nostr: mentions, and NIP-92 imeta media tags.
 */

import type { NostrEvent, ConvertResult, MicroblogPost, Facet } from './types.js';
import { parseUnixTimestamp, truncateForAtProto, linkFacet, tagFacet } from './utils.js';

interface ParsedETag {
  eventId: string;
  relayUrl?: string;
  marker?: string; // "root", "reply", "mention"
  authorPubkey?: string;
}

interface ParsedImeta {
  url: string;
  mimeType?: string;
  alt?: string;
  dimensions?: string; // e.g. "3024x4032"
}

function parseETags(tags: string[][]): { root?: ParsedETag; reply?: ParsedETag; mentions: ParsedETag[] } {
  const eTags: ParsedETag[] = [];

  for (const tag of tags) {
    if (tag[0] !== 'e' || tag.length < 2) continue;
    eTags.push({
      eventId: tag[1],
      relayUrl: tag[2],
      marker: tag[3],
      authorPubkey: tag[4],
    });
  }

  // If there are marked e tags, use those
  const marked = eTags.filter((t) => t.marker === 'root' || t.marker === 'reply');
  if (marked.length > 0) {
    return {
      root: marked.find((t) => t.marker === 'root'),
      reply: marked.find((t) => t.marker === 'reply'),
      mentions: eTags.filter((t) => t.marker === 'mention'),
    };
  }

  // Fallback: positional e tags (deprecated but still common)
  // First e tag = root, last e tag = parent reply
  if (eTags.length === 1) {
    return { root: eTags[0], reply: eTags[0], mentions: [] };
  }
  if (eTags.length >= 2) {
    return { root: eTags[0], reply: eTags[eTags.length - 1], mentions: [] };
  }

  return { mentions: [] };
}

function parseImetaTags(tags: string[][]): ParsedImeta[] {
  const images: ParsedImeta[] = [];

  for (const tag of tags) {
    if (tag[0] !== 'imeta') continue;

    const imeta: ParsedImeta = { url: '' };
    for (let i = 1; i < tag.length; i++) {
      const part = tag[i];
      const spaceIdx = part.indexOf(' ');
      if (spaceIdx === -1) continue;
      const key = part.slice(0, spaceIdx);
      const value = part.slice(spaceIdx + 1);

      if (key === 'url') imeta.url = value;
      else if (key === 'm') imeta.mimeType = value;
      else if (key === 'alt') imeta.alt = value;
      else if (key === 'dim') imeta.dimensions = value;
    }

    if (imeta.url) {
      images.push(imeta);
    }
  }

  return images;
}

export function convertNostr(data: unknown): ConvertResult {
  const events = Array.isArray(data) ? (data as NostrEvent[]) : [];
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const event of events) {
    try {
      // Only process text notes (kind 1). Skip kind 6 (reposts).
      if (event.kind === 6) {
        skipped++;
        continue;
      }
      if (event.kind !== 1) {
        continue;
      }

      const text = event.content?.trim();
      if (!text) {
        skipped++;
        continue;
      }

      const facets: Facet[] = [];

      // Parse e tags for reply threading
      const { root, reply } = parseETags(event.tags);

      // Parse q tags for quote references (NIP-18)
      let quoteUri: string | undefined;
      for (const tag of event.tags) {
        if (tag[0] === 'q' && tag[1]) {
          quoteUri = `nostr:${tag[1]}`;
        }
      }

      // Parse t tags for hashtags (NIP-12)
      for (const tag of event.tags) {
        if (tag[0] === 't' && tag[1]) {
          const tagName = tag[1].startsWith('#') ? tag[1] : `#${tag[1]}`;
          const charIndex = text.indexOf(tagName);
          if (charIndex !== -1) {
            facets.push(tagFacet(text, charIndex, charIndex + tagName.length, tag[1]));
          }
        }
      }

      // Parse r tags for URLs
      for (const tag of event.tags) {
        if (tag[0] === 'r' && tag[1]) {
          const url = tag[1];
          const charIndex = text.indexOf(url);
          if (charIndex !== -1) {
            facets.push(linkFacet(text, charIndex, charIndex + url.length, url));
          }
        }
      }

      // Parse p tags for mentions — cannot resolve to Bluesky DID
      // Convert nostr:npub references in text to link facets
      for (const tag of event.tags) {
        if (tag[0] === 'p' && tag[1]) {
          // Find nostr:npub1... or nostr:nprofile1... references in text
          const nostrRefRegex = /nostr:(nprofile1[a-zA-Z0-9]+|npub1[a-zA-Z0-9]+)/g;
          let match: RegExpExecArray | null;
          while ((match = nostrRefRegex.exec(text)) !== null) {
            facets.push(linkFacet(
              text,
              match.index,
              match.index + match[0].length,
              `nostr:${tag[1]}`,
            ));
          }
        }
      }

      // Parse imeta tags for media (NIP-92)
      const imetaImages = parseImetaTags(event.tags);

      const { text: finalText, truncated } = truncateForAtProto(text);

      const post: MicroblogPost = {
        text: finalText,
        createdAt: parseUnixTimestamp(event.created_at),
        platform: 'nostr',
        originalId: event.id,
        originalUrl: `nostr:nevent1${event.id}`,
        facets: facets.length > 0 ? facets : undefined,
        truncated,
        // Reply threading
        replyTo: reply ? `nostr:${reply.eventId}` : undefined,
        threadRoot: root ? `nostr:${root.eventId}` : undefined,
        quoteUri,
        // Media from imeta tags
        mediaUris: imetaImages.length > 0 ? imetaImages.map((i) => i.url) : undefined,
        mediaAlt: imetaImages.length > 0 ? imetaImages.map((i) => i.alt ?? '') : undefined,
        mediaMimeTypes: imetaImages.length > 0 ? imetaImages.map((i) => i.mimeType ?? 'image/jpeg') : undefined,
      };

      posts.push(post);
    } catch (err) {
      errors.push(`Nostr event ${event.id}: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
