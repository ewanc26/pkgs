/**
 * Publisher for Spark posts
 * Handles blob upload and so.sprk.feed.post record creation
 *
 * Supports batch record creation via com.atproto.repo.applyWrites
 * for efficient bulk imports.
 */
import type { Agent } from "@atproto/api";
import { generateTID } from "@ewanc26/tid";
import type {
  SparkMediaImage,
  SparkMediaImages,
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
 * Input descriptor for batch Spark post publishing
 */
export interface SparkPostInput {
  images: Array<{
    data: Uint8Array;
    mimeType: string;
    size: number;
    alt: string;
    aspectRatio?: SparkAspectRatio;
  }>;
  createdAt: string;
  caption?: string;
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
 *
 * This is a thin wrapper around publishSparkPosts for backward compatibility.
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
  const results = await publishSparkPosts(agent, [{
    images,
    createdAt,
    caption,
  }], dryRun);
  return results[0];
}

/**
 * Batch publish multiple Spark posts using com.atproto.repo.applyWrites
 *
 * 1. Upload all blobs for each post sequentially
 * 2. Batch-create all post records in a single API call
 *
 * Each post can contain up to 12 images. The blob uploads happen per-post,
 * but all record creations are batched into one applyWrites call.
 */
export async function publishSparkPosts(
  agent: Agent,
  posts: SparkPostInput[],
  dryRun = false,
): Promise<SparkPublishResult[]> {
  if (dryRun) {
    return posts.map(() => ({ success: true, uri: "dry-run", cid: "dry-run" }));
  }

  if (posts.length === 0) {
    return [];
  }

  const results: SparkPublishResult[] = [];
  const writes: Array<{
    $type: string;
    collection: string;
    rkey: string;
    value: Record<string, unknown>;
  }> = [];

  // Process each post: upload blobs, build record
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    try {
      // Upload all image blobs for this post
      const mediaImages: SparkMediaImage[] = [];

      for (const img of post.images.slice(0, 12)) {
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
      const record: Record<string, unknown> = {
        $type: SPARK_POST_COLLECTION,
        createdAt: post.createdAt,
        media,
      };

      if (post.caption) {
        record.caption = { text: post.caption };
      }

      writes.push({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: SPARK_POST_COLLECTION,
        rkey: generateTID(post.createdAt),
        value: record,
      });
    } catch (error) {
      // Individual post processing/upload failed
      results[i] = { success: false, error: (error as Error).message };
    }
  }

  // Execute applyWrites in chunks if necessary
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
          for (let j = 0; j < respResults.length; j++) {
            const globalIdx = chunkStart + j;
            results[globalIdx] = {
              success: true,
              uri: respResults[j].uri,
              cid: respResults[j].cid,
            };
          }
        }
      } catch (error) {
        for (let j = 0; j < chunk.length; j++) {
          const globalIdx = chunkStart + j;
          results[globalIdx] = { success: false, error: (error as Error).message };
        }
      }
    }
  }

  // Fill any remaining gaps
  for (let i = 0; i < posts.length; i++) {
    if (!results[i]) {
      results[i] = { success: false, error: "Unknown error during batch publish" };
    }
  }

  return results;
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
