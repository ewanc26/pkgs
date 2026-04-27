/**
 * Core type definitions for Jasper
 */

import type { Agent } from "@atproto/api";

// ============================================
// Grain Types
// ============================================

export interface GrainAspectRatio {
  width: number;
  height: number;
}

export interface GrainPhotoRecord {
  $type: "social.grain.photo";
  photo: {
    $type: "blob";
    ref: { $link: string };
    mimeType: string;
    size: number;
  };
  aspectRatio: GrainAspectRatio;
  createdAt: string; // ISO 8601
  alt?: string;
}

export interface GrainGalleryRecord {
  $type: "social.grain.gallery";
  title: string;
  description?: string;
  createdAt: string; // ISO 8601
  updatedAt?: string;
}

export interface GrainGalleryItemRecord {
  $type: "social.grain.gallery.item";
  gallery: string; // AT-URI of gallery
  item: string; // AT-URI of photo
  position: number;
  createdAt: string; // ISO 8601
}

// ============================================
// Instagram Export Types
// ============================================

export interface InstagramExportMedia {
  uri: string; // Relative path within ZIP
  creation_timestamp: number; // Unix seconds
  title?: string;
}

export interface InstagramExportPost {
  title?: string; // Caption
  creation_timestamp?: number; // Unix seconds
  uri?: string; // First media path (sometimes at post level)
  media: InstagramExportMedia[];
}

export interface ParsedMedia {
  /** Resolved absolute path or zip entry path */
  path: string;
  /** Media type */
  type: "image" | "video";
  /** Original relative path from export */
  originalUri: string;
  /** Creation timestamp */
  timestamp: Date;
  /** Loaded data (for browser) */
  data?: Blob;
}

export interface ParsedPost {
  /** Unique identifier derived from timestamp */
  id: string;
  /** Post caption */
  caption?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Media items */
  media: ParsedMedia[];
  /** Whether post was skipped during processing */
  skipped?: boolean;
  /** Reason for skipping if applicable */
  skipReason?: string;
  /** Whether this is an Instagram story (vs regular post) */
  isStory?: boolean;
}

// ============================================
// Import Types
// ============================================

export interface ImportOptions {
  /** Path to ZIP file or directory */
  input: string;
  /** Preview without posting */
  dryRun: boolean;
  /** Maximum posts to import */
  limit?: number;
  /** Process newest first */
  reverse: boolean;
  /** Skip confirmation prompts */
  yes: boolean;
  /** Verbose logging */
  verbose: boolean;
  /** Quiet mode */
  quiet: boolean;
  /** Override alt text for all photos */
  alt?: string;
  /** Target platform */
  target: Target;
}

export interface ImportResult {
  /** Total posts found */
  total: number;
  /** Posts successfully imported */
  imported: number;
  /** Posts skipped */
  skipped: number;
  /** Posts failed */
  failed: number;
  /** Skipped posts with reasons */
  skippedPosts: Array<{ post: ParsedPost; reason: string }>;
}

// ============================================
// Auth Types
// ============================================

export interface AuthCredentials {
  identifier: string;
  password: string;
}

export interface OAuthSession {
  did: string;
  handle?: string;
  createdAt: number;
  lastUsedAt: number;
}

// ============================================
// CLI Types
// ============================================

export interface CommandLineArgs {
  help?: boolean;
  input?: string;
  dryRun?: boolean;
  limit?: number;
  reverse?: boolean;
  yes?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  alt?: string;
  target?: Target;
  oauthLogin?: boolean;
  logout?: string;
  listSessions?: boolean;
  handle?: string;
  password?: string;
  dailyLimit?: number;
  resume?: boolean;
  listImports?: boolean;
  clearImports?: boolean;
}

// ============================================
// Import State Types
// ============================================

/**
 * Persistent state for resumable imports
 */
export interface ImportState {
  /** Original export file path */
  exportPath: string;
  /** SHA-256 hash of export file for verification */
  exportHash: string;
  /** Target platform for this import */
  target: Target;
  /** Gallery URI for imported photos (Grain only) */
  galleryUri: string;
  /** Gallery title for display (Grain only) */
  galleryTitle: string;
  /** Total posts found in export */
  totalPosts: number;
  /** ISO timestamps of successfully imported posts */
  importedTimestamps: string[];
  /** ISO timestamps of skipped posts (duplicates, videos) */
  skippedTimestamps: string[];
  /** ISO timestamps of failed posts */
  failedTimestamps: string[];
  /** When this import session was created */
  createdAt: string;
  /** When the last successful import occurred */
  lastImportAt: string | null;
  /** Number of posts imported today */
  dailyImported: number;
  /** When the daily counter resets (next day) */
  dailyResetAt: string;
}

// ============================================
// Target Platform Types
// ============================================

/** Supported import target platforms */
export type Target = "grain" | "spark";

/** Target-specific configuration */
export interface TargetConfig {
  /** Target platform identifier */
  target: Target;
  /** Maximum image size in bytes */
  maxImageSize: number;
  /** Maximum images per post (0 = single image per record) */
  maxImagesPerPost: number;
  /** Collection NSID for the main record type */
  collection: string;
  /** Whether the target supports galleries */
  supportsGalleries: boolean;
  /** Whether alt text is required */
  altRequired: boolean;
  /** Whether the target supports stories */
  supportsStories: boolean;
  /** Whether the target supports video uploads */
  supportsVideo: boolean;
  /** Collection NSID for story records */
  storyCollection: string;
}

// ============================================
// Spark Types
// ============================================

export interface SparkAspectRatio {
  width: number;
  height: number;
}

export interface SparkMediaImage {
  $type: "so.sprk.media.image";
  image: {
    $type: "blob";
    ref: { $link: string };
    mimeType: string;
    size: number;
  };
  alt: string;
  aspectRatio?: SparkAspectRatio;
}

export interface SparkMediaImages {
  $type: "so.sprk.media.images";
  images: SparkMediaImage[];
}

export interface SparkMediaVideo {
  $type: "so.sprk.media.video";
  video: {
    $type: "blob";
    ref: { $link: string };
    mimeType: string;
    size: number;
  };
  alt?: string;
  aspectRatio?: SparkAspectRatio;
}

/** Spark post media union — either images or video */
export type SparkPostMedia = SparkMediaImages | SparkMediaVideo;

export interface SparkPostRecord {
  $type: "so.sprk.feed.post";
  createdAt: string;
  media: SparkPostMedia;
  caption?: {
    text: string;
    facets?: unknown[];
  };
  langs?: string[];
  tags?: string[];
  labels?: unknown;
  [key: string]: unknown;
}

export interface SparkStoryPostRecord {
  $type: "so.sprk.story.post";
  createdAt: string;
  media: SparkPostMedia;
  sound?: {
    $type: "blob";
    ref: { $link: string };
    mimeType: string;
    size: number;
  };
  labels?: unknown;
  [key: string]: unknown;
}

// ============================================
// Config Types
// ============================================

export interface Config {
  /** Grain lexicon NSID for photos */
  GRAIN_PHOTO_COLLECTION: "social.grain.photo";
  /** Maximum image size in bytes (1MB limit from Grain lexicon) */
  MAX_IMAGE_SIZE: number;
  /** Supported image formats */
  SUPPORTED_IMAGE_FORMATS: string[];
  /** Default batch size for uploads */
  DEFAULT_BATCH_SIZE: number;
  /** Delay between uploads in ms */
  DEFAULT_UPLOAD_DELAY: number;
  /** Minimum upload delay in ms */
  MIN_UPLOAD_DELAY: number;
}

export type { Agent };
