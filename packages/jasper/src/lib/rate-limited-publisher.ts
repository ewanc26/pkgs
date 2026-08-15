/**
 * Rate-limited publisher wrapper
 * Integrates Malachite's RateLimiter with Jasper's publishing
 */
import type { Client } from '@atproto/lex';
import { RateLimiter, isRateLimitError } from "@ewanc26/croft-click-core";
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
    this.client = client;
    this.dryRun = dryRun;
    this.rateLimiter = new RateLimiter({ headroom });
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

    try {
      const result = await publishPhoto(
        this.client,
        imageData,
        aspectRatio,
        createdAt,
        alt,
        this.dryRun,
      );

      return result;
    } catch (error) {
      if (isRateLimitError(error)) {
        log.warn("Rate limit hit, waiting for reset...");
        this.rateLimiter.handleRateLimitHit();
        // Wait and retry once
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
      throw error;
    }
  }

  /**
   * Create a gallery with rate limiting
   */
  async createGallery(
    title: string,
    description?: string,
  ): Promise<GalleryResult> {
    await this.waitForQuota(OPERATION_POINTS.GALLERY);

    try {
      return await createGallery(this.client, title, description, this.dryRun);
    } catch (error) {
      if (isRateLimitError(error)) {
        log.warn("Rate limit hit, waiting for reset...");
        this.rateLimiter.handleRateLimitHit();
        await this.waitForQuota(OPERATION_POINTS.GALLERY);
        return createGallery(this.client, title, description, this.dryRun);
      }
      throw error;
    }
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

    try {
      return await createGalleryItem(
        this.client,
        galleryUri,
        photoUri,
        position,
        createdAt,
        this.dryRun,
      );
    } catch (error) {
      if (isRateLimitError(error)) {
        log.warn("Rate limit hit, waiting for reset...");
        this.rateLimiter.handleRateLimitHit();
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
      throw error;
    }
  }
}
