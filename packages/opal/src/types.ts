/**
 * Shared types for @ewanc26/opal.
 *
 * MicroblogPost is the normalised intermediate format — all platform parsers
 * produce this. The publisher then converts these into app.bsky.feed.post records.
 */

// ─── Platform sources ────────────────────────────────────────────────────────

export type Platform = 'twitter' | 'mastodon' | 'threads' | 'nostr';

// ─── Normalised post ─────────────────────────────────────────────────────────

export interface MicroblogPost {
  /** Plain text content (HTML already stripped for Mastodon) */
  text: string;
  /** ISO 8601 timestamp of the original post */
  createdAt: string;
  /** Local file paths or URLs for media attachments */
  mediaUris?: string[];
  /** URI of parent post (for threading) */
  replyTo?: string;
  /** URI of quoted post */
  quoteUri?: string;
  /** Source platform */
  platform: Platform;
  /** Platform-specific post ID */
  originalId: string;
  /** Link to original post on the source platform */
  originalUrl?: string;
  /** Pre-computed ATProto facets (links, mentions, hashtags) */
  facets?: Facet[];
  /** Whether this post was truncated to fit the 300-grapheme limit */
  truncated?: boolean;
}

// ─── ATProto facet types ────────────────────────────────────────────────────

export interface ByteSlice {
  byteStart: number;
  byteEnd: number;
}

export type FacetFeature =
  | { $type: 'app.bsky.richtext.facet#link'; uri: string }
  | { $type: 'app.bsky.richtext.facet#mention'; did: string }
  | { $type: 'app.bsky.richtext.facet#tag'; tag: string };

export interface Facet {
  index: ByteSlice;
  features: FacetFeature[];
}

// ─── Conversion result ──────────────────────────────────────────────────────

export interface ConvertResult {
  posts: MicroblogPost[];
  /** Number of posts skipped (empty, too long, duplicates) */
  skipped: number;
  /** Parsing errors */
  errors: string[];
}

// ─── Conversion options ─────────────────────────────────────────────────────

export interface ConvertOptions {
  source: Platform;
  /** Path to input file, or raw string/JSON data */
  input: string;
  /** Path to write converted JSON output */
  output?: string;
  /** Whether to publish to AT Protocol after conversion */
  publish?: boolean;
  /** Dry run — show what would be published without actually publishing */
  dryRun?: boolean;
}

// ─── Platform-specific input types ──────────────────────────────────────────

/** Twitter archive tweet object (from tweets.js) */
export interface TwitterTweet {
  id_str: string;
  full_text: string;
  created_at: string; // "Tue Jun 15 20:32:00 +0000 2021"
  in_reply_to_status_id_str?: string;
  in_reply_to_user_id_str?: string;
  quoted_status_id_str?: string;
  entities?: {
    media?: TwitterMediaEntity[];
    urls?: { url: string; expanded_url: string; indices: [number, number] }[];
    hashtags?: { text: string; indices: [number, number] }[];
    user_mentions?: { screen_name: string; id_str: string; indices: [number, number] }[];
  };
  retweeted_status?: TwitterTweet;
}

export interface TwitterMediaEntity {
  media_url_https: string;
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  indices: [number, number];
}

/** Mastodon outbox item */
export interface MastodonOutboxItem {
  type: string;
  object: MastodonStatus;
}

export interface MastodonStatus {
  type: string;
  id: string;
  content: string; // HTML
  published: string; // ISO 8601
  inReplyTo?: string;
  attachment?: MastodonAttachment[];
  tag?: MastodonTag[];
}

export interface MastodonAttachment {
  type: 'Document';
  mediaType?: string;
  url: string;
  name?: string;
}

export interface MastodonTag {
  type: 'Hashtag' | 'Mention';
  name?: string;
  href?: string;
}

/** Threads export post (limited schema) */
export interface ThreadsPost {
  id: string;
  text?: string;
  timestamp: string; // ISO 8601
  media?: { uri: string; type: string }[];
  parent_id?: string;
  quote_id?: string;
}

/** Nostr event (kind 1 = text note) */
export interface NostrEvent {
  id: string;
  kind: number;
  content: string;
  created_at: number; // Unix timestamp
  tags: string[][];
  pubkey: string;
}
