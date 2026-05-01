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
  /** URLs or local paths for media attachments */
  mediaUris?: string[];
  /** Alt text for media attachments (parallel to mediaUris) */
  mediaAlt?: string[];
  /** MIME types for media attachments (parallel to mediaUris) */
  mediaMimeTypes?: string[];
  /** URI of the root post in a thread (for Bluesky reply.root) */
  threadRoot?: string;
  /** URI of parent post (for Bluesky reply.parent) */
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
  /** BCP-47 language tag(s) */
  langs?: string[];
  /** Content warning text (Mastodon CWs — prepend to text) */
  contentWarning?: string;
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

/**
 * Twitter archive entry wrapper.
 * Each entry in the tweets.js array is wrapped: { tweet: { ... } }
 */
export interface TwitterArchiveEntry {
  tweet: TwitterTweet;
}

/** Twitter archive tweet object */
export interface TwitterTweet {
  id_str: string;
  full_text: string;
  created_at: string; // "Tue Jun 15 20:32:00 +0000 2021"
  lang?: string; // e.g. "en", "und"
  in_reply_to_status_id_str?: string;
  in_reply_to_user_id_str?: string;
  in_reply_to_screen_name?: string;
  conversation_id_str?: string;
  is_quote_status?: boolean;
  quoted_status_id_str?: string;
  quoted_status_permalink?: {
    url: string;
    expanded: string;
    display: string;
  };
  retweeted_status?: TwitterTweet;
  entities?: {
    media?: TwitterMediaEntity[];
    urls?: TwitterUrlEntity[];
    hashtags?: { text: string; indices: [number, number] }[];
    user_mentions?: { screen_name: string; name: string; id_str: string; indices: [number, number] }[];
    symbols?: unknown[];
  };
  extended_entities?: {
    media?: TwitterMediaEntity[];
  };
}

export interface TwitterMediaEntity {
  id_str: string;
  media_url_https: string;
  type: 'photo' | 'video' | 'animated_gif';
  url: string; // t.co shortlink
  display_url: string;
  expanded_url: string;
  indices: [number, number];
  sizes?: Record<string, { w: number; h: number; resize: string }>;
  video_info?: {
    variants: { bitrate?: number; content_type: string; url: string }[];
  };
}

export interface TwitterUrlEntity {
  url: string; // t.co shortlink
  expanded_url: string;
  display_url: string;
  indices: [number, number];
}

/** Mastodon outbox item (Create activity wrapping a Note) */
export interface MastodonOutboxItem {
  type: string; // "Create", "Announce", etc.
  object: MastodonStatus;
}

export interface MastodonStatus {
  type: string; // "Note"
  id: string;
  content: string; // HTML
  published: string; // ISO 8601
  inReplyTo?: string;
  sensitive?: boolean;
  summary?: string; // Content warning text
  attachment?: MastodonAttachment[];
  tag?: MastodonTag[];
}

export interface MastodonAttachment {
  type: string; // "Document", "Image", etc.
  mediaType?: string;
  url: string;
  name?: string; // alt text
  width?: number;
  height?: number;
}

export interface MastodonTag {
  type: string; // "Hashtag", "Mention"
  name?: string;
  href?: string;
}

/**
 * Threads export post.
 * Meta doesn't publish a schema — this is inferred from community reverse-engineering.
 * The actual export uses `title` for text and `creation_timestamp` (Unix seconds).
 */
export interface ThreadsPost {
  title?: string; // Post text/caption
  creation_timestamp?: number; // Unix seconds
  // Legacy/alternative fields (some exports use these instead)
  text?: string;
  timestamp?: string;
  id?: string;
  media?: ThreadsMedia[];
  // These are rarely present in the export
  parent_id?: string;
  quote_id?: string;
}

export interface ThreadsMedia {
  uri: string; // Local path in archive, e.g. "media/posts/12345.jpg"
  title?: string; // Caption/alt text
  creation_timestamp?: number;
  media_metadata?: {
    photo_metadata?: {
      exif_data?: Array<{ latitude?: number; longitude?: number }>;
    };
  };
}

/** Nostr event (kind 1 = text note) */
export interface NostrEvent {
  id: string;
  kind: number;
  content: string;
  created_at: number; // Unix timestamp (seconds)
  tags: string[][];
  pubkey: string;
  sig?: string;
}
