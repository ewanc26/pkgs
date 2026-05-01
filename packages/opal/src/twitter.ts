/**
 * Twitter/X archive parser.
 *
 * Parses the `tweets.js` file from a Twitter data export.
 * The file assigns to `window.YTD.tweets.part0` — the convert dispatcher
 * already extracts the JSON array before passing it here.
 *
 * Each entry is wrapped: { tweet: { ... } }
 */

import type { TwitterArchiveEntry, TwitterTweet, ConvertResult, MicroblogPost, Facet } from './types.js';
import { parseTwitterTimestamp, truncateForAtProto, linkFacet, tagFacet, twitterUrl } from './utils.js';

/**
 * Replace t.co short URLs in tweet text with their expanded forms.
 * Returns the cleaned text and a map of original indices → new positions.
 */
function replaceTcoUrls(
  text: string,
  urls: { url: string; expanded_url: string; indices: [number, number] }[] | undefined,
  media: { url: string; indices: [number, number] }[] | undefined,
): string {
  if (!urls && !media) return text;

  // Collect all t.co replacements (URLs + media shortlinks)
  const replacements: { start: number; end: number; replacement: string }[] = [];

  if (urls) {
    for (const url of urls) {
      replacements.push({
        start: url.indices[0],
        end: url.indices[1],
        replacement: url.expanded_url,
      });
    }
  }

  // Media t.co links are replaced with the display text (not the URL)
  if (media) {
    for (const m of media) {
      replacements.push({
        start: m.indices[0],
        end: m.indices[1],
        replacement: '', // Remove the t.co media link — media is handled separately
      });
    }
  }

  // Sort by position (descending) to replace from end to start
  replacements.sort((a, b) => b.start - a.start);

  let result = text;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
  }

  return result;
}

export function convertTwitter(data: unknown): ConvertResult {
  const entries = data as TwitterArchiveEntry[];
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const entry of entries) {
    try {
      // Handle both wrapped ({ tweet: {...} }) and bare tweet objects
      const tweet: TwitterTweet = entry.tweet ?? (entry as unknown as TwitterTweet);

      // Skip retweets — they're someone else's content
      if (tweet.retweeted_status) {
        skipped++;
        continue;
      }

      const rawText = tweet.full_text?.trim();
      if (!rawText) {
        skipped++;
        continue;
      }

      // Replace t.co URLs with expanded URLs in the text
      const allMedia = tweet.extended_entities?.media ?? tweet.entities?.media;
      const text = replaceTcoUrls(rawText, tweet.entities?.urls, allMedia);

      const facets: Facet[] = [];

      // Convert Twitter entities to ATProto facets
      // NOTE: After t.co replacement, character positions have shifted.
      // We need to find the expanded URLs and hashtags in the new text.
      if (tweet.entities) {
        // URLs — find expanded URLs in the replaced text
        if (tweet.entities.urls) {
          for (const url of tweet.entities.urls) {
            const charIndex = text.indexOf(url.expanded_url);
            if (charIndex !== -1) {
              facets.push(linkFacet(text, charIndex, charIndex + url.expanded_url.length, url.expanded_url));
            }
          }
        }

        // Hashtags — find in the cleaned text
        if (tweet.entities.hashtags) {
          for (const hashtag of tweet.entities.hashtags) {
            const tagWithHash = `#${hashtag.text}`;
            const charIndex = text.indexOf(tagWithHash);
            if (charIndex !== -1) {
              facets.push(tagFacet(text, charIndex, charIndex + tagWithHash.length, hashtag.text));
            }
          }
        }

        // User mentions — cannot resolve to Bluesky DID, use link facet
        if (tweet.entities.user_mentions) {
          for (const mention of tweet.entities.user_mentions) {
            const mentionText = `@${mention.screen_name}`;
            const charIndex = text.indexOf(mentionText);
            if (charIndex !== -1) {
              facets.push(linkFacet(
                text,
                charIndex,
                charIndex + mentionText.length,
                `https://bsky.app/profile/${mention.screen_name}.bsky.social`,
              ));
            }
          }
        }
      }

      const { text: finalText, truncated } = truncateForAtProto(text);

      // Use extended_entities for media (includes all media, not just first)
      const mediaEntities = tweet.extended_entities?.media ?? tweet.entities?.media;
      const imageMedia = mediaEntities?.filter((m) => m.type === 'photo');

      const post: MicroblogPost = {
        text: finalText,
        createdAt: parseTwitterTimestamp(tweet.created_at),
        platform: 'twitter',
        originalId: tweet.id_str,
        originalUrl: twitterUrl('_', tweet.id_str),
        facets: facets.length > 0 ? facets : undefined,
        truncated,
        mediaUris: imageMedia?.map((m) => m.media_url_https),
        mediaAlt: imageMedia?.map(() => ''), // Twitter archives don't include alt text
        mediaMimeTypes: imageMedia?.map(() => 'image/jpeg'), // Twitter media is typically JPEG
        // Reply threading
        replyTo: tweet.in_reply_to_status_id_str
          ? `twitter:status:${tweet.in_reply_to_status_id_str}`
          : undefined,
        threadRoot: tweet.conversation_id_str && tweet.conversation_id_str !== tweet.id_str
          ? `twitter:status:${tweet.conversation_id_str}`
          : undefined,
        // Quote tweets
        quoteUri: tweet.quoted_status_id_str
          ? twitterUrl('_', tweet.quoted_status_id_str)
          : undefined,
        // Language
        langs: tweet.lang && tweet.lang !== 'und' ? [tweet.lang] : undefined,
      };

      posts.push(post);
    } catch (err) {
      errors.push(`Twitter tweet: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
