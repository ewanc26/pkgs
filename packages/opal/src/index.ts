/**
 * @ewanc26/opal
 *
 * Convert microblog posts from Twitter, Mastodon, Threads, and Nostr
 * to AT Protocol Bluesky posts.
 */

// Conversion
export { convertData, parseTwitterArchive } from './convert.js';
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
  splitTextToChunks,
  splitToThread,
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
  TwitterArchiveEntry,
  TwitterTweet,
  TwitterMediaEntity,
  TwitterUrlEntity,
  MastodonOutboxItem,
  MastodonStatus,
  MastodonAttachment,
  MastodonTag,
  ThreadsPost,
  ThreadsMedia,
  NostrEvent,
} from './types.js';

export type {
  PublishProgress,
  PublisherCallbacks,
} from './publisher.js';

export type {
  RateLimitHeaders,
} from './rate-limit-headers.js';
