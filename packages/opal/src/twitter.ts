/**
 * Twitter/X archive parser.
 *
 * Parses the `tweets.js` file from a Twitter data export.
 * The file assigns to `window.YTD.tweets.part0` — the convert dispatcher
 * already extracts the JSON array before passing it here.
 */

import type { TwitterTweet, ConvertResult, MicroblogPost, Facet } from './types.js';
import { parseTwitterTimestamp, truncateForAtProto, linkFacet, tagFacet, twitterUrl } from './utils.js';

export function convertTwitter(data: unknown): ConvertResult {
  const tweets = data as TwitterTweet[];
  const posts: MicroblogPost[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const tweet of tweets) {
    try {
      // Skip retweets — they're someone else's content
      if (tweet.retweeted_status) {
        skipped++;
        continue;
      }

      const text = tweet.full_text?.trim();
      if (!text) {
        skipped++;
        continue;
      }

      const facets: Facet[] = [];

      // Convert Twitter entities to ATProto facets
      if (tweet.entities) {
        // URLs — replace t.co links with expanded URLs
        if (tweet.entities.urls) {
          for (const url of tweet.entities.urls) {
            facets.push(linkFacet(text, url.indices[0], url.indices[1], url.expanded_url));
          }
        }

        // Hashtags
        if (tweet.entities.hashtags) {
          for (const hashtag of tweet.entities.hashtags) {
            facets.push(tagFacet(text, hashtag.indices[0], hashtag.indices[1] + 1, hashtag.text));
          }
        }
      }

      const { text: finalText, truncated } = truncateForAtProto(text);

      const post: MicroblogPost = {
        text: finalText,
        createdAt: parseTwitterTimestamp(tweet.created_at),
        platform: 'twitter',
        originalId: tweet.id_str,
        originalUrl: twitterUrl('_', tweet.id_str), // username filled in by caller if known
        facets: facets.length > 0 ? facets : undefined,
        truncated,
        mediaUris: tweet.entities?.media?.map((m) => m.media_url_https),
        replyTo: tweet.in_reply_to_status_id_str
          ? `twitter:status:${tweet.in_reply_to_status_id_str}`
          : undefined,
        quoteUri: tweet.quoted_status_id_str
          ? twitterUrl('_', tweet.quoted_status_id_str)
          : undefined,
      };

      posts.push(post);
    } catch (err) {
      errors.push(`Twitter tweet ${tweet.id_str}: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { posts, skipped, errors };
}
