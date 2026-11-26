/**
 * Rate-limited publisher wrapper
 * Integrates Malachite's RateLimiter with Jasper's publishing
 */
import type { Client } from '@atproto/lex';
import { RateLimiter } from "@ewanc26/croft-click-core";
import { withRateLimitRetry } from "./pds.js";
import {
  publishPhoto,
  createGallery,
  createGalleryItem,
  type PublishResult,
  type GalleryResult,
} from "./publisher.js";
import { log } from "../utils/logger.js";

/**
 * ATProto rate limit points
 * CREATE = 3, UPDATE = 2, DELETE = 1
 */
export const POINTS = {
  CREATE: 3,
  UPDATE: 2,
  DELETE: 1,
} as const;

/**
 * Points needed for each operation
 * Photo record = CREATE (3)
 * Gallery record = CREATE (3)
 * Gallery item record = CREATE (3)
 * Spark post = CREATE (3)
 */
export const OPERATION_POINTS = {
  PHOTO: POINTS.CREATE,
  GALLERY: POINTS.CREATE,
  GALLERY_ITEM: POINTS.CREATE,
  SPARK_POST: POINTS.CREATE,
} as const;

/**
 * Rate-limited publisher with quota tracking
 */
export class RateLimitedPublisher {
  private rateLimiter: RateLimiter;
  private client: Client;
  private dryRun: boolean;
  private cancelled = false;

  constructor(client: Client, dryRun = false, headroom = 0.15) {
    this.dryRun = dryRun;
    this.rateLimiter = new RateLimiter({ headroom });
    // 429s are waited out and resent inside the client: the publish helpers
    // report failures as results, so a retry around them would never fire.
    this.client = withRateLimitRetry(client, this.rateLimiter, {
      isCancelled: () => this.cancelled,
      onWait: ({ reason, resumeAt, remainingSeconds, totalWaitSeconds }) => {
        if (remainingSeconds !== totalWaitSeconds) return;
        log.warn(`${reason}. Resuming at ${new Date(resumeAt).toLocaleTimeString()} (Ctrl+C to stop; progress is saved).`);
      },
    });
  }

  /** The rate-limit-aware client, for calls made outside this publisher. */
  getClient(): Client {
    return this.client;
  }

  /**
   * Update rate limiter from response headers
   */
  updateFromHeaders(headers: Record<string, string>): void {
    this.rateLimiter.updateFromHeaders(headers);
  }

  /**
   * Get current quota info
   */
  getQuotaInfo(): { remaining: number; limit: number } | null {
    if (!this.rateLimiter.hasServerInfo()) return null;
    const capacity = this.rateLimiter.getServerCapacity();
    return {
      remaining: this.rateLimiter.getActualRemaining(),
      limit: capacity?.limit ?? 0,
    };
  }

  /**
   * Cancel any pending waits
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Check if cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Wait for quota before an operation
   */
  private async waitForQuota(points: number): Promise<void> {
    await this.rateLimiter.waitForPermit(points, () => this.cancelled);
  }

  /**
   * Publish a photo with rate limiting
   */
  async publishPhoto(
    imageData: Buffer | Uint8Array,
    aspectRatio: { width: number; height: number },
    createdAt: string,
    alt?: string,
  ): Promise<PublishResult> {
    await this.waitForQuota(OPERATION_POINTS.PHOTO);

    return publishPhoto(
      this.client,
      imageData,
      aspectRatio,
      createdAt,
      alt,
      this.dryRun,
    );
  }

  /**
   * Create a gallery with rate limiting
   */
  async createGallery(
    title: string,
    description?: string,
    createdAt?: string,
  ): Promise<GalleryResult> {
    await this.waitForQuota(OPERATION_POINTS.GALLERY);

    return createGallery(
      this.client,
      title,
      description,
      this.dryRun,
      createdAt,
    );
  }

  /**
   * Create a gallery item with rate limiting
   */
  async createGalleryItem(
    galleryUri: string,
    photoUri: string,
    position: number,
    createdAt: string,
  ): Promise<PublishResult> {
    await this.waitForQuota(OPERATION_POINTS.GALLERY_ITEM);

    return createGalleryItem(
      this.client,
      galleryUri,
      photoUri,
      position,
      createdAt,
      this.dryRun,
    );
  }
}
