/**
 * Publisher for Spark stories
 * Handles blob upload and so.sprk.story.post record creation
 */
import type { Client } from '@atproto/lex';
import { generateTID } from "@ewanc26/tid";
import type {
  SparkMediaImage,
  SparkMediaImages,
  SparkMediaVideo,
  SparkStoryPostRecord,
  SparkAspectRatio,
} from "../core/types.js";
import {
  SPARK_STORY_COLLECTION,
  SPARK_MEDIA_IMAGES,
  SPARK_MEDIA_IMAGE,
  SPARK_MEDIA_VIDEO,
} from "../core/config.js";
import { log } from "../utils/logger.js";
import { com } from '@bsky/sdk/lexicons'

/**
 * Result of publishing a Spark story
 */
export interface SparkStoryPublishResult {
  success: boolean;
  uri?: string;
  cid?: string;
  error?: string;
}

/**
 * Upload an image as a blob
 */
async function uploadBlob(
  client: Client,
  imageData: Uint8Array,
  mimeType: string,
): Promise<{ cid: string; mimeType: string }> {
  const form = new FormData();
  form.append('file', new Blob([imageData as any], { type: mimeType }));

  const res = await fetch(`${(client as any).service || 'https://bsky.social'}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: (client as any).session?.accessJwt ? { Authorization: `Bearer ${(client as any).session.accessJwt}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Blob upload failed: ${res.status}`);
  }

  const data = await res.json() as { blob: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number } };
  return {
    cid: data.blob.ref.toString(),
    mimeType: data.blob.mimeType,
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
    $type: SPARK_MEDIA_IMAGE,
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
 * Publish a Spark story with images
 *
 * Stories use so.sprk.story.post, which has a media union
 * of so.sprk.media.images or so.sprk.media.video.
 */
export async function publishSparkStory(
  client: Client,
  images: Array<{
    data: Uint8Array;
    mimeType: string;
    size: number;
    alt: string;
    aspectRatio?: SparkAspectRatio;
  }>,
  createdAt: string,
  dryRun = false,
): Promise<SparkStoryPublishResult> {
  if (dryRun) {
    log.debug(
      `[DRY RUN] Would publish Spark story from ${createdAt} with ${images.length} image(s)`,
    );
    return { success: true, uri: "dry-run", cid: "dry-run" };
  }

  try {
    // Upload all image blobs
    const mediaImages: SparkMediaImage[] = [];

    for (const img of images) {
      const blob = await uploadBlob(client, img.data, img.mimeType);
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
    const record: SparkStoryPostRecord = {
      $type: SPARK_STORY_COLLECTION,
      createdAt,
      media,
    };

    const result = await client.call(com.atproto.repo.createRecord, {
      repo: client.assertDid!,
      collection: SPARK_STORY_COLLECTION,
      rkey: generateTID(createdAt),
      record: record as any,
    });

    return {
      success: true,
      uri: result.uri,
      cid: result.cid,
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
 * Publish a Spark story with a video
 */
export async function publishSparkVideoStory(
  client: Client,
  videoBlob: {
    cid: string;
    mimeType: string;
    size: number;
  },
  alt: string,
  aspectRatio: SparkAspectRatio,
  createdAt: string,
  dryRun = false,
): Promise<SparkStoryPublishResult> {
  if (dryRun) {
    log.debug(`[DRY RUN] Would publish Spark video story from ${createdAt}`);
    return { success: true, uri: "dry-run", cid: "dry-run" };
  }

  try {
    const media: SparkMediaVideo = {
      $type: SPARK_MEDIA_VIDEO,
      video: {
        $type: "blob",
        ref: { $link: videoBlob.cid },
        mimeType: videoBlob.mimeType,
        size: videoBlob.size,
      },
      alt,
      aspectRatio,
    };

    const record: SparkStoryPostRecord = {
      $type: SPARK_STORY_COLLECTION,
      createdAt,
      media,
    };

    const result = await client.call(com.atproto.repo.createRecord, {
      repo: client.assertDid!,
      collection: SPARK_STORY_COLLECTION,
      rkey: generateTID(createdAt),
      record: record as any,
    });

    return {
      success: true,
      uri: result.uri,
      cid: result.cid,
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
 * Check for existing Spark stories to avoid duplicates
 */
export async function getExistingSparkStories(
  client: Client,
): Promise<Set<string>> {
  const existing = new Set<string>();

  try {
    let cursor: string | undefined;
    do {
      const result = await client.call(com.atproto.repo.listRecords, {
        repo: client.assertDid!,
        collection: SPARK_STORY_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const record of result.records) {
        const value = record.value as { createdAt?: string };
        if (value.createdAt) {
          existing.add(value.createdAt);
        }
      }

      cursor = result.cursor;
    } while (cursor);
  } catch (error) {
    log.warn(
      "Could not fetch existing Spark stories (continuing without deduplication)",
    );
  }

  return existing;
}
