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
import { browserLog as log } from "./browser-logger.js";
import { fixFacebookEncoding } from "./parser.js";
import { publishPhoto, createGallery, createGalleryItem, getExistingGalleries, getExistingPhotos } from "./publisher.js";
import type { Agent } from "@atproto/api";
import { GRAIN_GALLERY_ITEM_COLLECTION } from "../core/config.js";
import { getImageDimensionsBrowser } from "./browser-image-utils.js";

/**
 * Gallery info for selection UI
 */
export interface GalleryInfo {
  uri: string;
  title: string;
  createdAt: string;
  itemCount?: number;
}

/**
 * Orphan photo info
 */
export interface OrphanPhoto {
  uri: string;
  createdAt: string;
}

/**
 * Get the file extension from a path
 */
function getExtension(filePath: string): string {
  // Browser-safe: get extension without Node.js path module
  const lastDot = filePath.lastIndexOf(".");
  return lastDot === -1 ? "" : filePath.slice(lastDot).toLowerCase();
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
 * Fetch user's existing galleries
 */
export async function fetchUserGalleries(agent: Agent): Promise<GalleryInfo[]> {
  const galleries = await getExistingGalleries(agent);
  return galleries.map(g => ({
    uri: g.uri,
    title: g.title,
    createdAt: g.createdAt,
  }));
}

/**
 * Create a new gallery
 */
export async function createNewGallery(
  agent: Agent,
  title: string,
  description?: string,
  dryRun = false,
): Promise<{ success: boolean; uri?: string; error?: string }> {
  const result = await createGallery(agent, title, description, dryRun);
  return { success: result.success, uri: result.uri, error: result.error };
}

/**
 * Find orphan photos (photos not in any gallery)
 * These would be from imports before the gallery fix
 */
export async function fetchOrphanPhotos(agent: Agent): Promise<OrphanPhoto[]> {
  const orphans: OrphanPhoto[] = [];

  try {
    // Get all gallery items to cross-reference
    const galleryItemUris = new Set<string>();
    let cursor: string | undefined;
    do {
      const result = await agent.com.atproto.repo.listRecords({
        repo: agent.did!,
        collection: GRAIN_GALLERY_ITEM_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const record of result.data.records) {
        const value = record.value as { item?: string };
        if (value.item) {
          galleryItemUris.add(value.item);
        }
      }

      cursor = result.data.cursor;
    } while (cursor);

    // Find photos not in any gallery
    cursor = undefined;
    do {
      const result = await agent.com.atproto.repo.listRecords({
        repo: agent.did!,
        collection: "social.grain.photo",
        limit: 100,
        cursor,
      });

      for (const record of result.data.records) {
        if (!galleryItemUris.has(record.uri)) {
          const value = record.value as { createdAt?: string };
          orphans.push({
            uri: record.uri,
            createdAt: value.createdAt || "",
          });
        }
      }

      cursor = result.data.cursor;
    } while (cursor);
  } catch (error) {
    log.error(`Failed to fetch orphan photos: ${error}`);
  }

  return orphans.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Add orphan photos to a gallery
 */
export async function organizeOrphanPhotos(
  agent: Agent,
  galleryUri: string,
  orphanUris: string[],
  dryRun = false,
  onProgress?: (current: number, total: number) => void,
  onLog?: (level: string, message: string) => void,
): Promise<{ success: number; errors: number }> {
  const logger = onLog
    ? { info: (msg: string) => onLog('info', msg), warn: (msg: string) => onLog('warn', msg), error: (msg: string) => onLog('error', msg), debug: (msg: string) => onLog('debug', msg) }
    : log;

  let success = 0;
  let errors = 0;

  for (let i = 0; i < orphanUris.length; i++) {
    const photoUri = orphanUris[i];
    onProgress?.(i + 1, orphanUris.length);

    // Extract createdAt from photo URI's rkey (TID)
    const createdAt = new Date().toISOString(); // Fallback

    try {
      logger.info(`Adding photo to gallery...`);
      const result = await createGalleryItem(
        agent,
        galleryUri,
        photoUri,
        i,
        createdAt,
        dryRun
      );

      if (result.success) {
        success++;
      } else {
        errors++;
        logger.error(`Failed: ${result.error}`);
      }
    } catch (error) {
      errors++;
      logger.error(`Error: ${error}`);
    }
  }

  return { success, errors };
}

/**
 * Image dimensions helper for browser Blobs
 */
async function getImageDimensionsFromBlob(blob: Blob): Promise<{ width: number; height: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return getImageDimensionsBrowser(uint8Array);
}

/**
 * Run the full import process in browser
 * Now supports gallery selection and batch limiting
 */
export async function runImport(
  agent: Agent,
  file: File,
  dryRun: boolean,
  galleryUri: string | null,
  batchSize: number = 100,
  onProgress?: (current: number, total: number) => void,
  onLog?: (level: string, message: string) => void,
): Promise<{ success: number; errors: number; photosImported: number; galleryItemsCreated: number }> {
  const logger = onLog
    ? { info: (msg: string) => onLog('info', msg), warn: (msg: string) => onLog('warn', msg), error: (msg: string) => onLog('error', msg) }
    : log;

  try {
    logger.info('Parsing Instagram export...');
    const posts = await parseExportFromFile(file);

    const validPosts = posts.filter(p => !p.skipped);
    logger.info(`Found ${validPosts.length} posts to import`);

    // Check for existing photos to skip duplicates
    logger.info('Checking for existing photos...');
    const existingPhotos = await getExistingPhotos(agent);
    logger.info(`Found ${existingPhotos.size} existing photos`);

    let photosImported = 0;
    let galleryItemsCreated = 0;
    let errors = 0;
    let galleryPosition = 0;
    let batchCount = 0;

    for (let i = 0; i < validPosts.length; i++) {
      const post = validPosts[i];
      const timestamp = post.createdAt.toISOString();

      // Skip duplicates
      if (existingPhotos.has(timestamp)) {
        logger.info(`Skipping duplicate: ${timestamp}`);
        continue;
      }

      // Check batch limit
      if (batchCount >= batchSize) {
        logger.warn(`Reached batch limit of ${batchSize}. Stopping to avoid rate limits.`);
        logger.warn('You can continue with another batch later.');
        break;
      }

      onProgress?.(i + 1, validPosts.length);

      for (const media of post.media) {
        if (media.type === 'image' && media.data) {
          try {
            // Get actual dimensions
            const dims = await getImageDimensionsFromBlob(media.data);

            logger.info(`Publishing photo from ${post.createdAt.toLocaleDateString()}`);
            const result = await publishPhotoFromBlob(
              agent,
              media.data,
              dims,
              timestamp,
              post.caption,
              dryRun
            );

            if (result.success) {
              photosImported++;
              batchCount++;

              // Create gallery item if gallery selected
              if (galleryUri && result.uri) {
                const itemResult = await createGalleryItem(
                  agent,
                  galleryUri,
                  result.uri,
                  galleryPosition,
                  timestamp,
                  dryRun
                );

                if (itemResult.success) {
                  galleryItemsCreated++;
                  galleryPosition++;
                } else {
                  logger.error(`Failed to create gallery item: ${itemResult.error}`);
                }
              }
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

    return {
      success: photosImported,
      errors,
      photosImported,
      galleryItemsCreated
    };
  } catch (error) {
    logger.error(`Import failed: ${error}`);
    throw error;
  }
}