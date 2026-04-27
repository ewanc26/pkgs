/**
 * Publisher for Spark posts
 * Handles blob upload and so.sprk.feed.post record creation
 */
import type { Agent } from "@atproto/api";
import { generateTID } from "@ewanc26/tid";
import type {
  SparkMediaImage,
  SparkMediaImages,
  SparkPostRecord,
  SparkAspectRatio,
} from "../core/types.js";
import { SPARK_POST_COLLECTION, SPARK_MEDIA_IMAGES } from "../core/config.js";
import { log } from "../utils/logger.js";

/**
 * Result of publishing a Spark post
 */
export interface SparkPublishResult {
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
 * Build a so.sprk.media.image object from a blob result
 */
function buildMediaImage(
  blob: { cid: string; mimeType: string },
  size: number,
  alt: string,
  aspectRatio?: SparkAspectRatio,
): SparkMediaImage {
  return {
    $type: "so.sprk.media.image",
    image: {
      $type: "blob",
      ref: { $link: blob.cid },
      mimeType: blob.mimeType,
      size,
    },
    alt,
    aspectRatio,
  };
}

/**
 * Publish a single-image or multi-image post to Spark
 *
 * For multi-image Instagram posts (carousels), all images are combined
 * into a single so.sprk.feed.post with so.sprk.media.images (max 12).
 */
export async function publishSparkPost(
  agent: Agent,
  images: Array<{
    data: Uint8Array;
    mimeType: string;
    size: number;
    alt: string;
    aspectRatio?: SparkAspectRatio;
  }>,
  createdAt: string,
  caption?: string,
  dryRun = false,
): Promise<SparkPublishResult> {
  if (dryRun) {
    log.debug(
      `[DRY RUN] Would publish Spark post from ${createdAt} with ${images.length} image(s)`,
    );
    return { success: true, uri: "dry-run", cid: "dry-run" };
  }

  try {
    // Upload all image blobs
    const mediaImages: SparkMediaImage[] = [];

    for (const img of images) {
      const blob = await uploadBlob(agent, img.data, img.mimeType);
      mediaImages.push(
        buildMediaImage(blob, img.size, img.alt, img.aspectRatio),
      );
    }

    // Build the media union
    const media: SparkMediaImages = {
      $type: SPARK_MEDIA_IMAGES,
      images: mediaImages,
    };

    // Build the record
    const record: SparkPostRecord = {
      $type: SPARK_POST_COLLECTION,
      createdAt,
      media,
    };

    if (caption) {
      record.caption = { text: caption };
    }

    const result = await agent.com.atproto.repo.createRecord({
      repo: agent.did!,
      collection: SPARK_POST_COLLECTION,
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
 * Check for existing Spark posts to avoid duplicates
 */
export async function getExistingSparkPosts(
  agent: Agent,
): Promise<Set<string>> {
  const existing = new Set<string>();

  try {
    let cursor: string | undefined;
    do {
      const result = await agent.com.atproto.repo.listRecords({
        repo: agent.did!,
        collection: SPARK_POST_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const record of result.data.records) {
        const value = record.value as { createdAt?: string };
        if (value.createdAt) {
          existing.add(value.createdAt);
        }
      }

      cursor = result.data.cursor;
    } while (cursor);
  } catch (error) {
    log.warn(
      "Could not fetch existing Spark posts (continuing without deduplication)",
    );
  }

  return existing;
}
