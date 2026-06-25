/**
 * Publisher for Grain photos and galleries
 * Handles blob upload and record creation
 *
 * Supports batch record creation via com.atproto.repo.applyWrites
 * for efficient bulk imports (avoids per-record rate limit costs).
 */
import type { Agent } from "@atproto/api";
import { generateTID } from "@ewanc26/tid";
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
 * Input descriptor for batch photo publishing
 */
export interface PhotoInput {
  imageData: Uint8Array;
  aspectRatio: { width: number; height: number };
  createdAt: string;
  alt?: string;
}

/**
 * Input descriptor for batch gallery item creation
 */
export interface GalleryItemInput {
  galleryUri: string;
  photoUri: string;
  position: number;
  createdAt: string;
}

/**
 * Maximum writes in a single applyWrites call (AT Protocol hard limit)
 */
const APPLY_WRITES_MAX = 200;

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
 *
 * This is a thin wrapper around publishPhotos for backward compatibility.
 */
export async function publishPhoto(
  agent: Agent,
  imageData: Buffer | Uint8Array,
  aspectRatio: { width: number; height: number },
  createdAt: string,
  alt?: string,
  dryRun = false,
): Promise<PublishResult> {
  const results = await publishPhotos(agent, [{
    imageData: imageData instanceof Buffer ? new Uint8Array(imageData) : imageData,
    aspectRatio,
    createdAt,
    alt,
  }], dryRun);
  return results[0];
}

/**
 * Batch publish multiple photos using com.atproto.repo.applyWrites
 *
 * 1. Process all images (resize/optimise)
 * 2. Upload all blobs sequentially
 * 3. Batch-create all record entries in a single API call
 *
 * Each photo's blob upload still happens sequentially (required by the PDS),
 * but the record creation is batched into one applyWrites call, dramatically
 * reducing per-record overhead and rate-limit consumption.
 */
export async function publishPhotos(
  agent: Agent,
  photos: PhotoInput[],
  dryRun = false,
): Promise<PublishResult[]> {
  if (dryRun) {
    return photos.map(() => ({ success: true, uri: "dry-run", cid: "dry-run" }));
  }

  if (photos.length === 0) {
    return [];
  }

  const results: PublishResult[] = [];
  const writes: Array<{
    $type: string;
    collection: string;
    rkey: string;
    value: Record<string, unknown>;
  }> = [];

  // Work through photos — parallel-safe blob creation (writes)
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    try {
      // Process image (resize if needed) - use browser or Node version
      const isBrowser =
        typeof globalThis !== "undefined" && "window" in globalThis;
      const processed = isBrowser
        ? await processImageBrowser(photo.imageData)
        : await (await import('./image-utils.js')).processImage(photo.imageData);

      // Upload blob
      const blob = await uploadBlob(
        agent,
        processed.processed,
        processed.mimeType,
      );

      // Build record for this photo
      const record = {
        $type: config.GRAIN_PHOTO_COLLECTION,
        photo: {
          $type: "blob",
          ref: { $link: blob.cid },
          mimeType: blob.mimeType,
          size: processed.size,
        },
        aspectRatio: processed.aspectRatio,
        createdAt: photo.createdAt,
        alt: photo.alt,
      };

      writes.push({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: config.GRAIN_PHOTO_COLLECTION,
        rkey: generateTID(photo.createdAt),
        value: record,
      });
    } catch (error) {
      // Individual photo processing/upload failed; leave slot empty
      results[i] = { success: false, error: (error as Error).message };
    }
  }

  // Execute applyWrites in chunks if necessary (AT Protocol max 200 writes)
  if (writes.length > 0) {
    for (let chunkStart = 0; chunkStart < writes.length; chunkStart += APPLY_WRITES_MAX) {
      const chunk = writes.slice(chunkStart, chunkStart + APPLY_WRITES_MAX);
      try {
        const response = await agent.com.atproto.repo.applyWrites({
          repo: agent.did!,
          writes: chunk as any,
        });

        const respResults = (response.data as any)?.results as Array<{ uri: string; cid: string }> | undefined;

        if (respResults) {
          // Map results back to the correct positions
          for (let j = 0; j < respResults.length; j++) {
            // Find the next empty slot in results (photos[i] that succeeded)
            const globalIdx = chunkStart + j;
            // The globalIdx corresponds to a photo that had no error during processing
            results[globalIdx] = {
              success: true,
              uri: respResults[j].uri,
              cid: respResults[j].cid,
            };
          }
        }
      } catch (error) {
        // Entire batch chunk failed — mark each as error
        for (let j = 0; j < chunk.length; j++) {
          const globalIdx = chunkStart + j;
          results[globalIdx] = { success: false, error: (error as Error).message };
        }
      }
    }
  }

  // Fill any remaining gaps (shouldn't happen, but be safe)
  for (let i = 0; i < photos.length; i++) {
    if (!results[i]) {
      results[i] = { success: false, error: "Unknown error during batch publish" };
    }
  }

  return results;
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
 * Create a single gallery item linking a photo to a gallery
 *
 * This is a thin wrapper around createGalleryItems for backward compatibility.
 */
export async function createGalleryItem(
  agent: Agent,
  galleryUri: string,
  photoUri: string,
  position: number,
  createdAt: string,
  dryRun = false,
): Promise<PublishResult> {
  const results = await createGalleryItems(agent, [{
    galleryUri,
    photoUri,
    position,
    createdAt,
  }], dryRun);
  return results[0];
}

/**
 * Batch create gallery items using com.atproto.repo.applyWrites
 *
 * Creates multiple gallery item records in a single API call.
 * Gallery items do not require blob uploads, so this is a pure batch
 * record creation operation.
 */
export async function createGalleryItems(
  agent: Agent,
  items: GalleryItemInput[],
  dryRun = false,
): Promise<PublishResult[]> {
  if (dryRun) {
    return items.map(() => ({ success: true, uri: "dry-run", cid: "dry-run" }));
  }

  if (items.length === 0) {
    return [];
  }

  const results: PublishResult[] = [];

  // Split into chunks if necessary (AT Protocol max 200 writes)
  for (let chunkStart = 0; chunkStart < items.length; chunkStart += APPLY_WRITES_MAX) {
    const chunk = items.slice(chunkStart, chunkStart + APPLY_WRITES_MAX);

    const writes = chunk.map((item) => ({
      $type: 'com.atproto.repo.applyWrites#create' as const,
      collection: GRAIN_GALLERY_ITEM_COLLECTION,
      rkey: generateTID(item.createdAt),
      value: {
        $type: GRAIN_GALLERY_ITEM_COLLECTION,
        gallery: item.galleryUri,
        item: item.photoUri,
        position: item.position,
        createdAt: item.createdAt,
      },
    }));

    try {
      const response = await agent.com.atproto.repo.applyWrites({
        repo: agent.did!,
        writes: writes as any,
      });

      const respResults = (response.data as any)?.results as Array<{ uri: string; cid: string }> | undefined;

      if (respResults) {
        for (let j = 0; j < respResults.length; j++) {
          const idx = chunkStart + j;
          results[idx] = {
            success: true,
            uri: respResults[j].uri,
            cid: respResults[j].cid,
          };
        }
      } else {
        // Fallback: assume success, derive URIs from rkeys
        for (let j = 0; j < chunk.length; j++) {
          const idx = chunkStart + j;
          results[idx] = {
            success: true,
            uri: `at://${agent.did}/${GRAIN_GALLERY_ITEM_COLLECTION}/${generateTID(chunk[j].createdAt)}`,
            cid: '',
          };
        }
      }
    } catch (error) {
      for (let j = 0; j < chunk.length; j++) {
        const idx = chunkStart + j;
        results[idx] = {
          success: false,
          error: (error as Error).message,
        };
      }
    }
  }

  return results;
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
