/**
 * Mastodon outbox parser.
 *
 * Parses ActivityPub outbox JSON (OrderedCollection) from a Mastodon export.
 * Handles Create (Note) and Announce (boost) activities — boosts are skipped.
 * Content warnings are preserved as a prefix on the text.
 */

import type { MastodonOutboxItem, MastodonAttachment, ConvertResult, MicroblogPost, Facet } from './types.js';
import { stripHtml, truncateForAtProto, linkFacet, tagFacet } from './utils.js';

export function convertMastodon(data: unknown): ConvertResult {
  // Handle both OrderedCollection wrapper and bare array
  const outbox = data as { orderedItems?: MastodonOutboxItem[] };
  const items = outbox.orderedItems ?? (data as MastodonOutboxItem[]);
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const item of items) {
    try {
      // Skip boosts (Announce activities) — they're someone else's content
      if (item.type === 'Announce') {
        skipped++;
        continue;
      }

      // Only process Create activities with Note objects
      if (item.type !== 'Create' || !item.object) {
        continue;
      }

      const status = item.object;
      if (status.type !== 'Note') {
        continue;
      }

      // Strip HTML and build plain text
      let text = stripHtml(status.content).trim();

      // Prepend content warning if present
      if (status.sensitive && status.summary) {
        text = `[CW: ${status.summary.trim()}]\n\n${text}`;
      }

      if (!text) {
        skipped++;
        continue;
      }

      const facets: Facet[] = [];

      // Convert hashtags and mentions
      if (status.tag) {
        for (const tag of status.tag) {
          if (tag.type === 'Hashtag' && tag.name) {
            const tagName = tag.name.startsWith('#') ? tag.name : `#${tag.name}`;
            const charIndex = text.indexOf(tagName);
            if (charIndex !== -1) {
              facets.push(tagFacet(text, charIndex, charIndex + tagName.length, tagName.slice(1)));
            }
          }

          // Mentions — cannot resolve to Bluesky DID, use link facet to profile
          if (tag.type === 'Mention' && tag.name && tag.href) {
            const mentionText = tag.name.startsWith('@') ? tag.name : `@${tag.name}`;
            const charIndex = text.indexOf(mentionText);
            if (charIndex !== -1) {
              facets.push(linkFacet(text, charIndex, charIndex + mentionText.length, tag.href));
            }
          }
        }
      }

      // Detect bare URLs in text for link facets
      const urlRegex = /https?:\/\/[^\s<]+/g;
      let match: RegExpExecArray | null;
      while ((match = urlRegex.exec(text)) !== null) {
        // Skip if this URL is already covered by a tag facet
        const start = match.index;
        const end = start + match[0].length;
        const overlaps = facets.some(
          (f) => start < f.index.byteEnd && end > f.index.byteStart,
        );
        if (!overlaps) {
          facets.push(linkFacet(text, start, end, match[0]));
        }
      }

      const { text: finalText, truncated } = truncateForAtProto(text);

      // Filter for image attachments only (videos have no Bluesky equivalent)
      const imageAttachments = status.attachment?.filter(
        (a: MastodonAttachment) =>
          a.mediaType?.startsWith('image/') ||
          a.type === 'Image' ||
          (a.type === 'Document' && a.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) !== null),
      );

      const post: MicroblogPost = {
        text: finalText,
        createdAt: status.published,
        platform: 'mastodon',
        originalId: status.id,
        facets: facets.length > 0 ? facets : undefined,
        truncated,
        mediaUris: imageAttachments?.map((a) => a.url),
        mediaAlt: imageAttachments?.map((a) => a.name ?? ''),
        mediaMimeTypes: imageAttachments?.map((a) => a.mediaType ?? 'image/jpeg'),
        replyTo: status.inReplyTo,
        contentWarning: status.sensitive && status.summary ? status.summary.trim() : undefined,
      };

      posts.push(post);
    } catch (err) {
      errors.push(`Mastodon item: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
