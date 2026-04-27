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
  original: Uint8Array;
  /** Processed buffer (resized/optimize if needed) */
  processed: Uint8Array;
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
  buffer: Uint8Array,
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
export async function getMimeType(buffer: Uint8Array): Promise<string> {
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
export function needsResizing(
  buffer: Uint8Array,
  maxSizeBytes?: number,
): boolean {
  return buffer.length > (maxSizeBytes ?? config.MAX_IMAGE_SIZE);
}

/**
 * Resize image to fit within size limit while maintaining aspect ratio
 */
export async function resizeImageToFitLimit(
  buffer: Uint8Array,
  maxSizeBytes?: number,
): Promise<{ buffer: Uint8Array; wasResized: boolean }> {
  const limit = maxSizeBytes ?? config.MAX_IMAGE_SIZE;
  // Already within limit
  if (buffer.length <= limit) {
    return { buffer, wasResized: false };
  }

  log.debug(
    `Image size ${buffer.length} bytes exceeds limit ${limit}, resizing...`,
  );

  // Get current dimensions
  const metadata = await sharp(buffer).metadata();
  const currentWidth = metadata.width || 1000;

  // Try reducing dimensions progressively
  let scale = 0.9;
  let result = buffer;
  let attempts = 0;
  const maxAttempts = 10;

  while (result.length > limit && attempts < maxAttempts) {
    const newWidth = Math.floor(currentWidth * scale);
    result = await sharp(buffer)
      .resize(newWidth)
      .jpeg({ quality: 85 })
      .toBuffer();

    scale *= 0.9;
    attempts++;
  }

  if (result.length > limit) {
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
export async function processImage(
  buffer: Uint8Array,
  maxSizeBytes?: number,
): Promise<ProcessedImage> {
  // Get original dimensions
  const dimensions = await getImageDimensions(buffer);
  const aspectRatio = calculateAspectRatio(dimensions.width, dimensions.height);

  // Resize if needed
  const { buffer: processed, wasResized } = await resizeImageToFitLimit(
    buffer,
    maxSizeBytes,
  );
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
  buffer: Uint8Array,
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

/**
 * Get video dimensions from an MP4 buffer
 *
 * Parses the mp4 box structure to find the track header (tkhd) box
 * which contains width and height. Falls back to 16:9 if parsing fails.
 */
export async function getVideoDimensions(
  buffer: Uint8Array,
): Promise<{ width: number; height: number }> {
  try {
    // Try to find tkhd box in the MP4 container
    // tkhd structure: version (1) + flags (3) + creation_time (4) + modification_time (4)
    //   + track_id (4) + reserved (4) + duration (4) + reserved (4+4)
    //   + layer (2) + alternate_group (2) + volume (2) + reserved (2)
    //   + matrix (36) + width (4, fixed-point 16.16) + height (4, fixed-point 16.16)
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );

    // Search for 'tkhd' box type (0x746B6864)
    for (let i = 0; i < buffer.length - 8; i++) {
      if (
        view.getUint32(i + 4) === 0x746b6864 // 'tkhd'
      ) {
        // Skip past the box header (8 bytes) and the version/flags (4 bytes)
        // and the rest of the fixed fields until width/height
        // In version 0: offset from box start = 8 (header) + 4 (ver/flags) + 4+4 (times) + 4 (track_id) + 4 (reserved) + 4 (duration) + 8 (reserved) + 2+2+2+2 (layer/group/volume/reserved) + 36 (matrix) = 84
        const version = view.getUint8(i + 8);
        const widthOffset =
          version === 0
            ? i + 8 + 4 + 4 + 4 + 4 + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36 // = i + 84
            : i + 8 + 4 + 8 + 8 + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36; // version 1: = i + 88

        if (widthOffset + 8 <= buffer.length) {
          const widthFixed = view.getUint32(widthOffset);
          const heightFixed = view.getUint32(widthOffset + 4);
          // Fixed-point 16.16 format — shift right by 16
          const width = widthFixed >> 16;
          const height = heightFixed >> 16;

          if (width > 0 && height > 0) {
            return { width, height };
          }
        }
        break; // Only check first tkhd
      }
    }
  } catch {
    // Parsing failed, use fallback
  }

  // Fallback: assume 16:9 at 1080p
  log.warn("Could not determine video dimensions, assuming 1920x1080");
  return { width: 1920, height: 1080 };
}
