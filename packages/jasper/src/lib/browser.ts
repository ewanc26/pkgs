/**
 * Browser-compatible functions for Jasper
 * Used by jasper-web to run the import pipeline in-browser
 */

import {
  BlobReader,
  BlobWriter,
  TextWriter,
  ZipReader,
  type FileEntry,
} from "@zip.js/zip.js";
import type {
  InstagramExportPost,
  ParsedPost,
  ParsedMedia,
} from "../core/types.js";
import { log } from "../utils/logger.js";
import path from "path";
import { fixFacebookEncoding } from "./parser.js";
import { publishPhoto } from "./publisher.js";
import type { Agent } from "@atproto/api";

/**
 * Get the file extension from a path
 */
function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if a file is a video
 */
function isVideo(filePath: string): boolean {
  const ext = getExtension(filePath);
  return ext === ".mp4" || ext === ".mov";
}

/**
 * Determine media type from path
 */
function getMediaType(filePath: string): "image" | "video" {
  if (isVideo(filePath)) return "video";
  return "image";
}

/**
 * Parse Instagram export from a File (browser)
 */
export async function parseExportFromFile(file: File): Promise<ParsedPost[]> {
  log.info(`Reading ZIP file: ${file.name}`);

  const zipReader = new ZipReader(new BlobReader(file));
  const entries = (await zipReader.getEntries()) as FileEntry[];

  // Find posts_1.json
  const postsEntry = findPostsJsonInZip(entries);
  if (!postsEntry) {
    await zipReader.close();
    throw new Error("posts_1.json not found in ZIP archive");
  }

  log.debug(`Found posts_1.json at: ${postsEntry.filename}`);

  // Extract and parse
  const postsText = await postsEntry.getData(new TextWriter());

  const posts = parsePostsJson(postsText);

  // Filter and log video posts
  const imagePosts: ParsedPost[] = [];
  for (const post of posts) {
    const hasVideo = post.media.some((m) => m.type === "video");
    if (hasVideo) {
      post.skipped = true;
      post.skipReason = "Contains video(s) — Grain does not support videos yet";
      log.warn(`Skipping video post from ${post.createdAt.toISOString()}`);
      continue;
    }

    imagePosts.push(post);
  }

  // Load media data for each post
  for (const post of imagePosts) {
    if (post.skipped) continue;

    for (const media of post.media) {
      if (media.type === "image") {
        try {
          const mediaEntry = findMediaInZip(entries, media.originalUri);
          if (mediaEntry) {
            media.data = await mediaEntry.getData(new BlobWriter());
          } else {
            log.warn(`Media file not found: ${media.originalUri}`);
            post.skipped = true;
            post.skipReason = `Media file missing: ${media.originalUri}`;
          }
        } catch (error) {
          log.error(`Failed to load media ${media.originalUri}: ${error}`);
          post.skipped = true;
          post.skipReason = `Failed to load media: ${error}`;
        }
      }
    }
  }

  await zipReader.close();

  log.info(`Parsed ${imagePosts.length} posts from ZIP`);
  return imagePosts;
}

/**
 * Find posts_1.json in the ZIP entries
 */
function findPostsJsonInZip(entries: FileEntry[]): FileEntry | null {
  for (const entry of entries) {
    if (entry.filename.endsWith("posts_1.json")) {
      return entry;
    }
  }
  return null;
}

/**
 * Find a media file in the ZIP entries
 */
function findMediaInZip(entries: FileEntry[], relativePath: string): FileEntry | null {
  // Instagram exports have media in various subdirectories
  // Try different possible paths
  const possiblePaths = [
    relativePath,
    `media/${relativePath}`,
    `photos/${relativePath}`,
    `videos/${relativePath}`,
  ];

  for (const path of possiblePaths) {
    for (const entry of entries) {
      if (entry.filename === path || entry.filename.endsWith(`/${path}`)) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Parse posts_1.json content
 */
function parsePostsJson(
  postsText: string,
): ParsedPost[] {
  log.debug("Parsing posts_1.json");

  // Fix encoding issues
  const fixedText = fixFacebookEncoding(postsText);

  let rawPosts: InstagramExportPost[];
  try {
    rawPosts = JSON.parse(fixedText);
  } catch (error) {
    throw new Error(`Failed to parse posts_1.json: ${error}`);
  }

  log.debug(`Found ${rawPosts.length} raw posts`);

  const posts: ParsedPost[] = [];

  for (const rawPost of rawPosts) {
    try {
      const post = parsePost(rawPost);
      if (post) {
        posts.push(post);
      }
    } catch (error) {
      log.warn(`Failed to parse post: ${error}`);
    }
  }

  return posts;
}

/**
 * Parse a single Instagram post
 */
function parsePost(
  rawPost: InstagramExportPost,
): ParsedPost | null {
  // Skip if no media
  if (!rawPost.media || rawPost.media.length === 0) {
    return null;
  }

  // Use the first media item's timestamp as the post timestamp
  const firstMedia = rawPost.media[0];
  const timestamp = new Date(firstMedia.creation_timestamp * 1000);

  // Generate ID from timestamp
  const id = timestamp.toISOString();

  const media: ParsedMedia[] = [];

  for (const rawMedia of rawPost.media) {
    const mediaItem: ParsedMedia = {
      path: rawMedia.uri,
      type: getMediaType(rawMedia.uri),
      originalUri: rawMedia.uri,
      timestamp: new Date(rawMedia.creation_timestamp * 1000),
    };

    // In browser, we load data later from ZIP
    media.push(mediaItem);
  }

  return {
    id,
    caption: rawPost.title || undefined,
    createdAt: timestamp,
    media,
  };
}

/**
 * Browser-compatible publishPhoto that accepts Blob
 */
export async function publishPhotoFromBlob(
  agent: Agent,
  imageBlob: Blob,
  aspectRatio: { width: number; height: number },
  createdAt: string,
  alt?: string,
  dryRun = false,
): Promise<{ success: boolean; uri?: string; cid?: string; error?: string }> {
  // Convert Blob to Uint8Array
  const arrayBuffer = await imageBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  return publishPhoto(agent, uint8Array, aspectRatio, createdAt, alt, dryRun);
}

/**
 * Run the full import process in browser
 */
export async function runImport(
  agent: Agent,
  file: File,
  dryRun: boolean,
  onProgress?: (current: number, total: number) => void,
  onLog?: (level: string, message: string) => void,
): Promise<{ success: number; errors: number }> {
  const logger = onLog ? { info: (msg: string) => onLog('info', msg), warn: (msg: string) => onLog('warn', msg), error: (msg: string) => onLog('error', msg) } : log;

  try {
    logger.info('Parsing Instagram export...');
    const posts = await parseExportFromFile(file);

    const validPosts = posts.filter(p => !p.skipped);
    logger.info(`Found ${validPosts.length} posts to import`);

    let success = 0;
    let errors = 0;

    for (let i = 0; i < validPosts.length; i++) {
      const post = validPosts[i];
      onProgress?.(i + 1, validPosts.length);

      for (const media of post.media) {
        if (media.type === 'image' && media.data) {
          try {
            logger.info(`Publishing photo from ${post.createdAt.toISOString()}`);
            const result = await publishPhotoFromBlob(
              agent,
              media.data,
              { width: 1, height: 1 }, // TODO: get actual aspect ratio
              post.createdAt.toISOString(),
              post.caption,
              dryRun
            );

            if (result.success) {
              success++;
            } else {
              errors++;
              logger.error(`Failed to publish: ${result.error}`);
            }
          } catch (error) {
            errors++;
            logger.error(`Error publishing photo: ${error}`);
          }
        }
      }
    }

    return { success, errors };
  } catch (error) {
    logger.error(`Import failed: ${error}`);
    throw error;
  }
}