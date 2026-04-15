/**
 * Image utilities using sharp
 * Handles image loading, dimension extraction, and validation
 */
import sharp from "sharp";
import type { GrainAspectRatio } from "../core/types.js";
import { config } from "../core/config.js";
import { log } from "../utils/logger.js";

/**
 * Image info after processing
 */
export interface ProcessedImage {
  /** Original buffer */
  original: Buffer;
  /** Processed buffer (resized/optimize if needed) */
  processed: Buffer;
  /** Image dimensions */
  dimensions: { width: number; height: number };
  /** Aspect ratio */
  aspectRatio: GrainAspectRatio;
  /** MIME type */
  mimeType: string;
  /** Size in bytes */
  size: number;
  /** Whether image was resized */
  wasResized: boolean;
}

/**
 * Get image dimensions from a buffer
 */
export async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 1,
    height: metadata.height || 1,
  };
}

/**
 * Calculate simplified aspect ratio
 * Reduces to smallest integer ratio (e.g., 4:3 instead of 800:600)
 */
export function calculateAspectRatio(
  width: number,
  height: number,
): GrainAspectRatio {
  // Find greatest common divisor
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);

  return {
    width: width / divisor,
    height: height / divisor,
  };
}

/**
 * Get MIME type from image buffer
 */
export async function getMimeType(buffer: Buffer): Promise<string> {
  const metadata = await sharp(buffer).metadata();
  const format = metadata.format;

  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg"; // Default fallback
  }
}

/**
 * Check if image needs resizing (exceeds size limit)
 */
export function needsResizing(buffer: Buffer): boolean {
  return buffer.length > config.MAX_IMAGE_SIZE;
}

/**
 * Resize image to fit within size limit while maintaining aspect ratio
 */
export async function resizeImageToFitLimit(
  buffer: Buffer,
  maxSizeBytes: number = config.MAX_IMAGE_SIZE,
): Promise<{ buffer: Buffer; wasResized: boolean }> {
  // Already within limit
  if (buffer.length <= maxSizeBytes) {
    return { buffer, wasResized: false };
  }

  log.debug(
    `Image size ${buffer.length} bytes exceeds limit ${maxSizeBytes}, resizing...`,
  );

  // Get current dimensions
  const metadata = await sharp(buffer).metadata();
  const currentWidth = metadata.width || 1000;

  // Try reducing dimensions progressively
  let scale = 0.9;
  let result = buffer;
  let attempts = 0;
  const maxAttempts = 10;

  while (result.length > maxSizeBytes && attempts < maxAttempts) {
    const newWidth = Math.floor(currentWidth * scale);
    result = await sharp(buffer)
      .resize(newWidth)
      .jpeg({ quality: 85 })
      .toBuffer();

    scale *= 0.9;
    attempts++;
  }

  if (result.length > maxSizeBytes) {
    // If still too large, use aggressive compression
    result = await sharp(buffer).resize(500).jpeg({ quality: 70 }).toBuffer();
  }

  log.debug(
    `Resized image from ${buffer.length} to ${result.length} bytes (attempts: ${attempts})`,
  );

  return { buffer: result, wasResized: true };
}

/**
 * Process an image for upload to Grain
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  // Get original dimensions
  const dimensions = await getImageDimensions(buffer);
  const aspectRatio = calculateAspectRatio(dimensions.width, dimensions.height);

  // Resize if needed
  const { buffer: processed, wasResized } = await resizeImageToFitLimit(buffer);
  const mimeType = await getMimeType(processed);

  // Get final dimensions after resizing
  let finalDimensions = dimensions;
  if (wasResized) {
    finalDimensions = await getImageDimensions(processed);
  }

  return {
    original: buffer,
    processed,
    dimensions: finalDimensions,
    aspectRatio: wasResized
      ? calculateAspectRatio(finalDimensions.width, finalDimensions.height)
      : aspectRatio,
    mimeType,
    size: processed.length,
    wasResized,
  };
}

/**
 * Validate an image buffer
 */
export async function validateImage(
  buffer: Buffer,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return { valid: false, error: "Unable to determine image dimensions" };
    }

    if (metadata.width < 1 || metadata.height < 1) {
      return { valid: false, error: "Invalid image dimensions" };
    }

    // Check format
    const supportedFormats = ["jpeg", "png", "webp", "gif"];
    if (!metadata.format || !supportedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Unsupported image format: ${metadata.format}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid image: ${(error as Error).message}`,
    };
  }
}
