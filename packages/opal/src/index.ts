/**
 * @ewanc26/opal
 *
 * Convert microblog posts from Twitter, Mastodon, Threads, and Nostr
 * to AT Protocol Bluesky posts.
 */

// Conversion
export { convert } from './convert.js';
export { convertTwitter } from './twitter.js';
export { convertMastodon } from './mastodon.js';
export { convertThreads } from './threads.js';
export { convertNostr } from './nostr.js';

// Publishing
export { publishRecords } from './publisher.js';
export { RateLimiter } from './rate-limiter.js';

// Utilities
export {
  stripHtml,
  countGraphemes,
  truncateForAtProto,
  parseTwitterTimestamp,
  parseUnixTimestamp,
  textToByteSlice,
  linkFacet,
  mentionFacet,
  tagFacet,
  MAX_GRAPHEME_COUNT,
} from './utils.js';

// Types
export type {
  Platform,
  MicroblogPost,
  ConvertResult,
  ConvertOptions,
  Facet,
  FacetFeature,
  ByteSlice,
  TwitterTweet,
  TwitterMediaEntity,
  MastodonOutboxItem,
  MastodonStatus,
  MastodonAttachment,
  MastodonTag,
  ThreadsPost,
  NostrEvent,
} from './types.js';

export type {
  PublishProgress,
  PublisherCallbacks,
} from './publisher.js';

export type {
  RateLimitHeaders,
} from './rate-limit-headers.js';
