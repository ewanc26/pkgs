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
