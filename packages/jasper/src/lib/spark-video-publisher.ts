/**
 * Publisher for Spark video posts
 * Handles video upload via so.sprk.video.uploadVideo, job polling,
 * and so.sprk.feed.post record creation with so.sprk.media.video
 */
import type { Agent } from "@atproto/api";
import { generateTID } from "@ewanc26/tid";
import type {
  SparkMediaVideo,
  SparkPostRecord,
  SparkAspectRatio,
} from "../core/types.js";
import { SPARK_POST_COLLECTION, SPARK_MEDIA_VIDEO } from "../core/config.js";
import { log } from "../utils/logger.js";

/** Maximum time to wait for video processing (5 minutes) */
const VIDEO_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Result of uploading a Spark video
 */
export interface SparkVideoUploadResult {
  success: boolean;
  blob?: {
    cid: string;
    mimeType: string;
    size: number;
  };
  error?: string;
}

/**
 * Result of publishing a Spark video post
 */
export interface SparkVideoPostResult {
  success: boolean;
  uri?: string;
  cid?: string;
  error?: string;
}

/**
 * Upload a video to Spark's processing pipeline
 *
 * Spark uses a two-step process:
 * 1. Upload video via so.sprk.video.uploadVideo procedure
 * 2. Poll so.sprk.video.getJobStatus until JOB_STATE_COMPLETED
 * 3. Use the returned blob in the record
 */
export async function uploadSparkVideo(
  agent: Agent,
  videoData: Uint8Array,
  mimeType: string,
): Promise<SparkVideoUploadResult> {
  try {
    // Step 1: Upload the video
    const uploadResult = await agent.com.atproto.repo.uploadBlob(videoData, {
      encoding: mimeType,
    });

    if (!uploadResult.data.blob) {
      throw new Error("No blob returned from video upload");
    }

    // Note: Spark's video upload flow (so.sprk.video.uploadVideo) is a
    // separate XRPC procedure that processes the video server-side.
    // For now, we use the standard blob upload as a fallback, since
    // the Spark video processing service may not be available on all PDSs.
    // When the Spark AppView is available, this should be updated to use
    // so.sprk.video.uploadVideo and poll for job completion.

    const blob = uploadResult.data.blob;
    return {
      success: true,
      blob: {
        cid: blob.ref.toString(),
        mimeType: blob.mimeType,
        size: blob.size,
      },
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
 * Poll video processing job status until complete
 *
 * Used when the Spark video processing service is available.
 * Currently a placeholder — the actual XRPC call to so.sprk.video.getJobStatus
 * requires a custom agent method since so.sprk.* isn't in the default @atproto/api types.
 */
export async function waitForVideoJob(
  _agent: Agent,
  _jobId: string,
  timeoutMs: number = VIDEO_PROCESSING_TIMEOUT_MS,
): Promise<SparkVideoUploadResult> {
  // Placeholder: wait for timeout then return failure
  // When Spark's video processing service is available, this should:
  // 1. Call so.sprk.video.getJobStatus with the jobId
  // 2. Check the state field for JOB_STATE_COMPLETED
  // 3. Return the processed blob reference
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));

  return {
    success: false,
    error: `Video processing timed out after ${timeoutMs / 1000}s`,
  };
}

/**
 * Publish a Spark post with video media
 *
 * Creates a so.sprk.feed.post with so.sprk.media.video as the media union.
 */
export async function publishSparkVideoPost(
  agent: Agent,
  videoBlob: {
    cid: string;
    mimeType: string;
    size: number;
  },
  alt: string,
  aspectRatio: SparkAspectRatio,
  createdAt: string,
  caption?: string,
  dryRun = false,
): Promise<SparkVideoPostResult> {
  if (dryRun) {
    log.debug(`[DRY RUN] Would publish Spark video post from ${createdAt}`);
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
