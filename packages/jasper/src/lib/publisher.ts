/**
 * Publisher for Grain photos and galleries
 * Handles blob upload and record creation
 */
import type { Agent } from "@atproto/api";
import { generateTID } from "@ewanc26/malachite/core";
import type { ParsedPost } from "../core/types.js";
import { config, GRAIN_GALLERY_COLLECTION, GRAIN_GALLERY_ITEM_COLLECTION } from "../core/config.js";
import { log } from "../utils/logger.js";
import {
  processImageBrowser,
} from "./browser-image-utils.js";

/**
 * Result of publishing a single photo
 */
export interface PublishResult {
  success: boolean;
  uri?: string;
  cid?: string;
  error?: string;
}

/**
 * Result of creating a gallery
 */
export interface GalleryResult {
  success: boolean;
  uri?: string;
  cid?: string;
  error?: string;
}

/**
 * Gallery info for listing
 */
export interface GalleryInfo {
  uri: string;
  title: string;
  createdAt: string;
}

/**
 * Upload an image as a blob
 */
async function uploadBlob(
  agent: Agent,
  imageData: Uint8Array,
  mimeType: string,
): Promise<{ cid: string; mimeType: string }> {
  const uploadResult = await agent.uploadBlob(imageData, {
    encoding: mimeType,
  });

  if (!uploadResult.data.blob) {
    throw new Error("No blob returned from upload");
  }

  return {
    cid: uploadResult.data.blob.ref.toString(),
    mimeType: uploadResult.data.blob.mimeType,
  };
}

/**
 * Publish a single photo to Grain
 */
export async function publishPhoto(
  agent: Agent,
  imageData: Buffer | Uint8Array,
  _aspectRatio: { width: number; height: number },
  createdAt: string,
  alt?: string,
  dryRun = false,
): Promise<PublishResult> {
  if (dryRun) {
    log.debug(`[DRY RUN] Would publish photo from ${createdAt}`);
    return { success: true, uri: "dry-run", cid: "dry-run" };
  }

  try {
    // Process image (resize if needed) - use browser or Node version
    const isBrowser =
      typeof globalThis !== "undefined" && "window" in globalThis;
    const processed = isBrowser
      ? await processImageBrowser(imageData as Uint8Array)
      : await (await import('./image-utils.js')).processImage(imageData as Uint8Array);

    // Upload blob
    const blob = await uploadBlob(
      agent,
      processed.processed,
      processed.mimeType,
    );

    // Create record
    const record = {
      $type: config.GRAIN_PHOTO_COLLECTION,
      photo: {
        $type: "blob",
        ref: { $link: blob.cid },
        mimeType: blob.mimeType,
        size: processed.size,
      },
      aspectRatio: processed.aspectRatio,
      createdAt,
      alt,
    };

    const result = await agent.com.atproto.repo.createRecord({
      repo: agent.did!,
      collection: config.GRAIN_PHOTO_COLLECTION,
      rkey: generateTID(createdAt),
      record,
    });

    return {
      success: true,
      uri: result.data.uri,
      cid: result.data.cid,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Check for existing photos to avoid duplicates
 */
export async function getExistingPhotos(agent: Agent): Promise<Set<string>> {
  const existing = new Set<string>();

  try {
    let cursor: string | undefined;
    do {
      const result = await agent.com.atproto.repo.listRecords({
        repo: agent.did!,
        collection: config.GRAIN_PHOTO_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const record of result.data.records) {
        // Extract createdAt from the record
        const value = record.value as { createdAt?: string };
        if (value.createdAt) {
          existing.add(value.createdAt);
        }
      }

      cursor = result.data.cursor;
    } while (cursor);
  } catch (error) {
    log.warn(
      "Could not fetch existing photos (continuing without deduplication)",
    );
  }

  return existing;
}

/**
 * Load and validate media for a post
 */
export async function loadPostMedia(
  post: ParsedPost,
  loadMediaFn: (path: string) => Promise<Buffer>,
): Promise<Array<{ buffer: Buffer; valid: boolean; error?: string }>> {
  const results: Array<{ buffer: Buffer; valid: boolean; error?: string }> = [];

  for (const media of post.media) {
    try {
      const buffer = await loadMediaFn(media.path);
      const validation = await (await import('./image-utils.js')).validateImage(buffer);

      results.push({
        buffer,
        valid: validation.valid,
        error: validation.error,
      });
    } catch (error) {
      results.push({
        buffer: Buffer.alloc(0),
        valid: false,
        error: (error as Error).message,
      });
    }
  }

  return results;
}

/**
 * Create a new gallery
 */
export async function createGallery(
  agent: Agent,
  title: string,
  description?: string,
  dryRun = false,
): Promise<GalleryResult> {
  if (dryRun) {
    log.debug(`[DRY RUN] Would create gallery: ${title}`);
    return { success: true, uri: "dry-run", cid: "dry-run" };
  }

  try {
    const now = new Date().toISOString();
    const record = {
      $type: GRAIN_GALLERY_COLLECTION,
      title,
      description,
      createdAt: now,
    };

    const result = await agent.com.atproto.repo.createRecord({
      repo: agent.did!,
      collection: GRAIN_GALLERY_COLLECTION,
      rkey: generateTID(now),
      record,
    });

    return {
      success: true,
      uri: result.data.uri,
      cid: result.data.cid,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Create a gallery item linking a photo to a gallery
 */
export async function createGalleryItem(
  agent: Agent,
  galleryUri: string,
  photoUri: string,
  position: number,
  createdAt: string,
  dryRun = false,
): Promise<PublishResult> {
  if (dryRun) {
    log.debug(`[DRY RUN] Would create gallery item: ${photoUri} -> ${galleryUri}`);
    return { success: true, uri: "dry-run", cid: "dry-run" };
  }

  try {
    const record = {
      $type: GRAIN_GALLERY_ITEM_COLLECTION,
      gallery: galleryUri,
      item: photoUri,
      position,
      createdAt,
    };

    const result = await agent.com.atproto.repo.createRecord({
      repo: agent.did!,
      collection: GRAIN_GALLERY_ITEM_COLLECTION,
      rkey: generateTID(createdAt),
      record,
    });

    return {
      success: true,
      uri: result.data.uri,
      cid: result.data.cid,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get existing galleries for the user
 */
export async function getExistingGalleries(agent: Agent): Promise<GalleryInfo[]> {
  const galleries: GalleryInfo[] = [];

  try {
    let cursor: string | undefined;
    do {
      const result = await agent.com.atproto.repo.listRecords({
        repo: agent.did!,
        collection: GRAIN_GALLERY_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const record of result.data.records) {
        const value = record.value as { title?: string; createdAt?: string };
        galleries.push({
          uri: record.uri,
          title: value.title || "Untitled",
          createdAt: value.createdAt || "",
        });
      }

      cursor = result.data.cursor;
    } while (cursor);
  } catch (error) {
    log.warn("Could not fetch existing galleries");
  }

  // Sort by createdAt descending (newest first)
  return galleries.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
