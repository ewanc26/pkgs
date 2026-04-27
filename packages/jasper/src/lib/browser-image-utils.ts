/**
 * Browser-compatible image utilities
 * No Node.js dependencies
 */

import type { GrainAspectRatio } from "../core/types.js";

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
 * Get MIME type from data
 */
export function getMimeTypeFromData(data: Uint8Array): string {
  // Check magic bytes
  if (data.length < 4) return "image/jpeg";

  const header = data.slice(0, 4);

  // JPEG
  if (header[0] === 0xff && header[1] === 0xd8) return "image/jpeg";

  // PNG
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  )
    return "image/png";

  // GIF
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46)
    return "image/gif";

  // WebP
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46
  )
    return "image/webp";

  return "image/jpeg"; // Default
}

/**
 * Get image dimensions in browser using Image API
 */
export async function getImageDimensionsBrowser(
  data: Uint8Array,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new (globalThis as any).Image();
    const url = URL.createObjectURL(new Blob([data as any]));

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Process an image for upload in browser
 */
export async function processImageBrowser(data: Uint8Array): Promise<{
  original: Uint8Array;
  processed: Uint8Array;
  dimensions: { width: number; height: number };
  aspectRatio: GrainAspectRatio;
  mimeType: string;
  size: number;
  wasResized: boolean;
}> {
  // For browser, we'll skip resizing for now and just return the original
  // TODO: Implement browser-based image resizing using Canvas API

  const mimeType = getMimeTypeFromData(data);

  // Get dimensions using Image
  const dimensions = await getImageDimensionsBrowser(data);

  const aspectRatio = calculateAspectRatio(dimensions.width, dimensions.height);

  return {
    original: data,
    processed: data, // No processing for now
    dimensions,
    aspectRatio,
    mimeType,
    size: data.length,
    wasResized: false,
  };
}

/**
 * Validate an image in browser
 */
export async function validateImageBrowser(
  data: Uint8Array,
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get dimensions to check if it's a valid image
    const dimensions = await getImageDimensionsBrowser(data);

    if (dimensions.width < 1 || dimensions.height < 1) {
      return { valid: false, error: "Invalid image dimensions" };
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
 * Get video dimensions in browser using HTMLVideoElement
 */
export async function getVideoDimensionsBrowser(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const g = globalThis as any;
    const video = g.document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      g.URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
      });
    };

    video.onerror = () => {
      g.URL.revokeObjectURL(video.src);
      // Fallback to 16:9
      resolve({ width: 1920, height: 1080 });
    };

    video.src = g.URL.createObjectURL(blob);
  });
}
