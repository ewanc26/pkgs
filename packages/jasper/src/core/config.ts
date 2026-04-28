/**
 * Jasper configuration constants
 */

import type { Config, Target, TargetConfig } from "./types.js";

export const VERSION = "0.5.1";

export const config: Config = {
  /** Grain lexicon NSID for photos */
  GRAIN_PHOTO_COLLECTION: "social.grain.photo",

  /** Maximum image size in bytes (1MB limit from Grain lexicon) */
  MAX_IMAGE_SIZE: 1_000_000,

  /** Supported image formats */
  SUPPORTED_IMAGE_FORMATS: [".jpg", ".jpeg", ".png", ".webp", ".gif"],

  /** Default batch size for uploads */
  DEFAULT_BATCH_SIZE: 10,

  /** Delay between uploads in ms */
  DEFAULT_UPLOAD_DELAY: 500,

  /** Minimum upload delay in ms */
  MIN_UPLOAD_DELAY: 200,
};

/** Target platform configurations */
export const TARGET_CONFIGS: Record<Target, TargetConfig> = {
  grain: {
    target: "grain",
    maxImageSize: 1_000_000,
    maxImagesPerPost: 0,
    collection: "social.grain.photo",
    supportsGalleries: true,
    altRequired: false,
    supportsStories: false,
    supportsVideo: false,
    storyCollection: "",
  },
  spark: {
    target: "spark",
    maxImageSize: 5_242_880,
    maxImagesPerPost: 12,
    collection: "so.sprk.feed.post",
    supportsGalleries: false,
    altRequired: true,
    supportsStories: true,
    supportsVideo: true,
    storyCollection: "so.sprk.story.post",
  },
};

/** Spark lexicon NSIDs */
export const SPARK_POST_COLLECTION = "so.sprk.feed.post" as const;
export const SPARK_MEDIA_IMAGES = "so.sprk.media.images" as const;
export const SPARK_MEDIA_IMAGE = "so.sprk.media.image" as const;
export const SPARK_MEDIA_VIDEO = "so.sprk.media.video" as const;
export const SPARK_STORY_COLLECTION = "so.sprk.story.post" as const;
export const SPARK_VIDEO_UPLOAD = "so.sprk.video.uploadVideo" as const;
export const SPARK_VIDEO_JOB_STATUS = "so.sprk.video.getJobStatus" as const;

/** Grain collection NSIDs for galleries */
export const GRAIN_GALLERY_COLLECTION = "social.grain.gallery" as const;
export const GRAIN_GALLERY_ITEM_COLLECTION =
  "social.grain.gallery.item" as const;

/**
 * Get the OAuth client ID for Jasper
 */
export function getOAuthClientId(): string {
  // TODO: Register OAuth client with Grain
  // For now, use a placeholder that can be overridden via env
  return (
    process.env.JASPER_OAUTH_CLIENT_ID ||
    "https://jasper.ewancroft.com/client-metadata.json"
  );
}

/**
 * Get the OAuth redirect URI
 */
export function getOAuthRedirectUri(): string {
  return (
    process.env.JASPER_OAUTH_REDIRECT_URI || "http://localhost:3000/callback"
  );
}

/**
 * Possible locations for posts_1.json in export archives
 * Checked in order, most common format first
 *
 * Note: Instagram's export format has evolved over time:
 * - 2023+: your_instagram_activity/content/posts_1.json (JSON metadata)
 * - 2025: your_instagram_activity/media/ contains HTML files (posts_1.html), not JSON
 * - 2022 and earlier: content/posts_1.json
 */
export const POSTS_JSON_PATHS = [
  "your_instagram_activity/content/posts_1.json", // 2023-2025 format (JSON)
  "your_instagram_activity/media/posts_1.json", // Alternate location (may not exist)
  "content/posts_1.json", // 2022 and earlier legacy format
];

/**
 * Possible locations for stories_1.json in export archives
 */
export const STORIES_JSON_PATHS = [
  "your_instagram_activity/content/stories_1.json",
  "your_instagram_activity/media/stories_1.json",
];

/**
 * Media directories to search within export archives
 */
export const MEDIA_DIRECTORIES = ["media/posts", "media/other"];

/**
 * Default daily import limit
 * Large exports should be split across multiple days to avoid hitting PDS quotas
 */
export const DEFAULT_DAILY_LIMIT = 100;

/**
 * Import state directory for resumable imports
 */
export const IMPORT_STATE_DIR = ".jasper/imports";
