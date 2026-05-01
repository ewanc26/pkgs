/**
 * Mastodon outbox/CSV parser.
 *
 * Parses ActivityPub outbox JSON (OrderedCollection) from a Mastodon export.
 * CSV export support can be added later.
 */

import type { MastodonOutboxItem, ConvertResult, MicroblogPost, Facet } from './types.js';
import { stripHtml, truncateForAtProto, tagFacet } from './utils.js';

export function convertMastodon(data: unknown): ConvertResult {
  const outbox = data as { orderedItems?: MastodonOutboxItem[] };
  const items = outbox.orderedItems ?? (data as MastodonOutboxItem[]);
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const item of items) {
    try {
      // Only process Create activities with Note objects
      if (item.type !== 'Create' || !item.object) {
        continue;
      }

      const status = item.object;
      if (status.type !== 'Note') {
        continue;
      }

      const text = stripHtml(status.content).trim();
      if (!text) {
        skipped++;
        continue;
      }

      const facets: Facet[] = [];

      // Convert hashtags
      if (status.tag) {
        for (const tag of status.tag) {
          if (tag.type === 'Hashtag' && tag.name) {
            // Mastodon hashtags include the # prefix
            const tagName = tag.name.startsWith('#') ? tag.name : `#${tag.name}`;
            const charIndex = text.indexOf(tagName);
            if (charIndex !== -1) {
              facets.push(tagFacet(text, charIndex, charIndex + tagName.length, tagName.slice(1)));
            }
          }
        }
      }

      const { text: finalText, truncated } = truncateForAtProto(text);

      const post: MicroblogPost = {
        text: finalText,
        createdAt: status.published,
        platform: 'mastodon',
        originalId: status.id,
        facets: facets.length > 0 ? facets : undefined,
        truncated,
        mediaUris: status.attachment?.map((a) => a.url),
        replyTo: status.inReplyTo,
      };

      posts.push(post);
    } catch (err) {
      errors.push(`Mastodon item: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
