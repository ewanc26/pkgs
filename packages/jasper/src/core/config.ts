/**
 * Jasper configuration constants
 */

import type { Config } from "./types.js";

export const VERSION = "0.2.0";

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
 * Checked in order, newest format first
 */
export const POSTS_JSON_PATHS = [
  "your_instagram_activity/media/posts_1.json", // 2025+ format
  "your_instagram_activity/content/posts_1.json", // 2023-2024 format
  "content/posts_1.json", // 2022 legacy format
];

/**
 * Media directories to search within export archives
 */
export const MEDIA_DIRECTORIES = ["media/posts", "media/other"];
