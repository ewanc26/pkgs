/**
 * Publisher for Grain photos
 * Handles blob upload and record creation
 */
import type { Agent } from "@atproto/api";
import type { ParsedPost } from "../core/types.js";
import { config } from "../core/config.js";
import { log } from "../utils/logger.js";
import { processImage, validateImage } from "./image-utils.js";

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
 * Upload an image as a blob
 */
async function uploadBlob(
  agent: Agent,
  imageData: Buffer,
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
  imageData: Buffer,
  aspectRatio: { width: number; height: number },
  createdAt: string,
  alt?: string,
  dryRun = false,
): Promise<PublishResult> {
  if (dryRun) {
    log.debug(`[DRY RUN] Would publish photo from ${createdAt}`);
    return { success: true, uri: "dry-run", cid: "dry-run" };
  }

  try {
    // Process image (resize if needed)
    const processed = await processImage(imageData);

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
      const validation = await validateImage(buffer);

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
