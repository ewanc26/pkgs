/**
 * Browser-compatible functions for Jasper
 * Used by jasper-web to run the import pipeline in-browser
 */

import {
  BlobReader,
  BlobWriter,
  TextWriter,
  ZipReader,
  type FileEntry,
} from "@zip.js/zip.js";
import type {
  InstagramExportPost,
  ParsedPost,
  ParsedMedia,
} from "../core/types.js";
import { browserLog as log } from "./browser-logger.js";
import { fixFacebookEncoding } from "./parser.js";
import {
  publishPhoto,
  createGallery,
  createGalleryItem,
  getExistingGalleries,
  getExistingPhotos,
} from "./publisher.js";
import { getExistingSparkPosts, publishSparkPost } from "./spark-publisher.js";
import {
  publishSparkStory,
  getExistingSparkStories,
} from "./spark-story-publisher.js";
import {
  uploadSparkVideo,
  publishSparkVideoPost,
} from "./spark-video-publisher.js";
import type { Agent } from "@atproto/api";
import type { Target, SparkAspectRatio } from "../core/types.js";
import { GRAIN_GALLERY_ITEM_COLLECTION } from "../core/config.js";
import {
  getImageDimensionsBrowser,
  getVideoDimensionsBrowser,
} from "./browser-image-utils.js";
import type { BrowserImportState } from "./browser-import-state.js";
import {
  saveBrowserImportState,
  loadBrowserImportState,
  clearBrowserImportState,
  fileMatchesState,
  createBrowserImportState,
  isBrowserDailyLimitReached,
  updateBrowserForNewDay,
  getBrowserRemainingPosts,
  formatBrowserImportStateSummary,
} from "./browser-import-state.js";

// Re-export browser import state functions and types
export {
  saveBrowserImportState,
  loadBrowserImportState,
  clearBrowserImportState,
  fileMatchesState,
  createBrowserImportState,
  isBrowserDailyLimitReached,
  updateBrowserForNewDay,
  getBrowserRemainingPosts,
  formatBrowserImportStateSummary,
  type BrowserImportState,
};

export type { Target } from "../core/types.js";

/**
 * Gallery info for selection UI
 */
export interface GalleryInfo {
  uri: string;
  title: string;
  createdAt: string;
  itemCount?: number;
}

/**
 * Orphan photo info
 */
export interface OrphanPhoto {
  uri: string;
  createdAt: string;
}

/**
 * Get the file extension from a path
 */
function getExtension(filePath: string): string {
  // Browser-safe: get extension without Node.js path module
  const lastDot = filePath.lastIndexOf(".");
  return lastDot === -1 ? "" : filePath.slice(lastDot).toLowerCase();
}

/**
 * Check if a file is a video
 */
function isVideo(filePath: string): boolean {
  const ext = getExtension(filePath);
  return ext === ".mp4" || ext === ".mov";
}

/**
 * Determine media type from path
 */
function getMediaType(filePath: string): "image" | "video" {
  if (isVideo(filePath)) return "video";
  return "image";
}

/**
 * Parse Instagram export from a File (browser)
 */
export async function parseExportFromFile(file: File): Promise<ParsedPost[]> {
  log.info(`Reading ZIP file: ${file.name}`);

  const zipReader = new ZipReader(new BlobReader(file));
  const entries = (await zipReader.getEntries()) as FileEntry[];

  // Find posts_1.json
  const postsEntry = findPostsJsonInZip(entries);
  if (!postsEntry) {
    await zipReader.close();
    throw new Error("posts_1.json not found in ZIP archive");
  }

  log.debug(`Found posts_1.json at: ${postsEntry.filename}`);

  // Extract and parse posts
  const postsText = await postsEntry.getData(new TextWriter());
  const posts = parsePostsJson(postsText);

  // Find and parse stories_1.json (optional)
  const storiesEntry = findStoriesJsonInZip(entries);
  if (storiesEntry) {
    log.debug(`Found stories_1.json at: ${storiesEntry.filename}`);
    const storiesText = await storiesEntry.getData(new TextWriter());
    const stories = parsePostsJson(storiesText, true);
    posts.push(...stories);
    log.info(`Found ${stories.length} stories`);
  }

  // Load media data for each post (images and videos)
  for (const post of posts) {
    if (post.skipped) continue;

    for (const media of post.media) {
      try {
        const mediaEntry = findMediaInZip(entries, media.originalUri);
        if (mediaEntry) {
          media.data = await mediaEntry.getData(new BlobWriter());
        } else {
          log.warn(`Media file not found: ${media.originalUri}`);
          post.skipped = true;
          post.skipReason = `Media file missing: ${media.originalUri}`;
        }
      } catch (error) {
        log.error(`Failed to load media ${media.originalUri}: ${error}`);
        post.skipped = true;
        post.skipReason = `Failed to load media: ${error}`;
      }
    }
  }

  await zipReader.close();

  const validPosts = posts.filter((p) => !p.skipped);
  log.info(`Parsed ${validPosts.length} posts from ZIP`);
  return validPosts;
}

/**
 * Find posts_1.json in the ZIP entries
 */
import { POSTS_JSON_PATHS, STORIES_JSON_PATHS } from "../core/config.js";

/**
 * Find posts_1.json in the ZIP entries using known possible paths
 */
function findPostsJsonInZip(entries: FileEntry[]): FileEntry | null {
  // Try known paths first
  for (const path of POSTS_JSON_PATHS) {
    const entry = entries.find(e => e.filename.endsWith(path));
    if (entry) return entry;
  }
  // Fallback: any entry ending with posts_1.json
  return entries.find(e => e.filename.endsWith("posts_1.json")) || null;
}

/**
 * Find stories_1.json in the ZIP entries using known possible paths
 */
function findStoriesJsonInZip(entries: FileEntry[]): FileEntry | null {
  for (const path of STORIES_JSON_PATHS) {
    const entry = entries.find(e => e.filename.endsWith(path));
    if (entry) return entry;
  }
  return entries.find(e => e.filename.endsWith("stories_1.json")) || null;
}

/**
 * Find a media file in the ZIP entries
 */
function findMediaInZip(
  entries: FileEntry[],
  relativePath: string,
): FileEntry | null {
  // Instagram exports have media in various subdirectories
  // Try different possible paths
  const possiblePaths = [
    relativePath,
    `media/${relativePath}`,
    `photos/${relativePath}`,
    `videos/${relativePath}`,
  ];

  for (const path of possiblePaths) {
    for (const entry of entries) {
      if (entry.filename === path || entry.filename.endsWith(`/${path}`)) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Parse posts_1.json or stories_1.json content
 */
function parsePostsJson(postsText: string, isStory = false): ParsedPost[] {
  log.debug(isStory ? "Parsing stories_1.json" : "Parsing posts_1.json");

  // Fix encoding issues
  const fixedText = fixFacebookEncoding(postsText);

  let rawPosts: InstagramExportPost[];
  try {
    rawPosts = JSON.parse(fixedText);
  } catch (error) {
    throw new Error(`Failed to parse ${isStory ? "stories" : "posts"}_1.json: ${error}`);
  }

  log.debug(`Found ${rawPosts.length} raw ${isStory ? "stories" : "posts"}`);

  const posts: ParsedPost[] = [];

  for (const rawPost of rawPosts) {
    try {
      const post = parsePost(rawPost, isStory);
      if (post) {
        posts.push(post);
      }
    } catch (error) {
      log.warn(`Failed to parse ${isStory ? "story" : "post"}: ${error}`);
    }
  }

  return posts;
}

/**
 * Parse a single Instagram post
 */
function parsePost(rawPost: InstagramExportPost, isStory = false): ParsedPost | null {
  // Skip if no media
  if (!rawPost.media || rawPost.media.length === 0) {
    return null;
  }

  // Use the first media item's timestamp as the post timestamp
  const firstMedia = rawPost.media[0];
  const timestamp = new Date(firstMedia.creation_timestamp * 1000);

  // Generate ID from timestamp
  const id = timestamp.toISOString();

  const media: ParsedMedia[] = [];

  for (const rawMedia of rawPost.media) {
    const mediaItem: ParsedMedia = {
      path: rawMedia.uri,
      type: getMediaType(rawMedia.uri),
      originalUri: rawMedia.uri,
      timestamp: new Date(rawMedia.creation_timestamp * 1000),
    };

    // In browser, we load data later from ZIP
    media.push(mediaItem);
  }

  return {
    id,
    caption: rawPost.title || undefined,
    createdAt: timestamp,
    media,
    isStory,
  };
}

/**
 * Browser-compatible publishPhoto that accepts Blob
 */
export async function publishPhotoFromBlob(
  agent: Agent,
  imageBlob: Blob,
  aspectRatio: { width: number; height: number },
  createdAt: string,
  alt?: string,
  dryRun = false,
): Promise<{ success: boolean; uri?: string; cid?: string; error?: string }> {
  // Convert Blob to Uint8Array
  const arrayBuffer = await imageBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  return publishPhoto(agent, uint8Array, aspectRatio, createdAt, alt, dryRun);
}

/**
 * Fetch user's existing galleries
 */
export async function fetchUserGalleries(agent: Agent): Promise<GalleryInfo[]> {
  const galleries = await getExistingGalleries(agent);
  return galleries.map((g) => ({
    uri: g.uri,
    title: g.title,
    createdAt: g.createdAt,
  }));
}

/**
 * Create a new gallery
 */
export async function createNewGallery(
  agent: Agent,
  title: string,
  description?: string,
  dryRun = false,
): Promise<{ success: boolean; uri?: string; error?: string }> {
  const result = await createGallery(agent, title, description, dryRun);
  return { success: result.success, uri: result.uri, error: result.error };
}

/**
 * Find orphan photos (photos not in any gallery)
 * These would be from imports before the gallery fix
 */
export async function fetchOrphanPhotos(agent: Agent): Promise<OrphanPhoto[]> {
  const orphans: OrphanPhoto[] = [];

  try {
    // Get all gallery items to cross-reference
    const galleryItemUris = new Set<string>();
    let cursor: string | undefined;
    do {
      const result = await agent.com.atproto.repo.listRecords({
        repo: agent.did!,
        collection: GRAIN_GALLERY_ITEM_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const record of result.data.records) {
        const value = record.value as { item?: string };
        if (value.item) {
          galleryItemUris.add(value.item);
        }
      }

      cursor = result.data.cursor;
    } while (cursor);

    // Find photos not in any gallery
    cursor = undefined;
    do {
      const result = await agent.com.atproto.repo.listRecords({
        repo: agent.did!,
        collection: "social.grain.photo",
        limit: 100,
        cursor,
      });

      for (const record of result.data.records) {
        if (!galleryItemUris.has(record.uri)) {
          const value = record.value as { createdAt?: string };
          orphans.push({
            uri: record.uri,
            createdAt: value.createdAt || "",
          });
        }
      }

      cursor = result.data.cursor;
    } while (cursor);
  } catch (error) {
    log.error(`Failed to fetch orphan photos: ${error}`);
  }

  return orphans.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Add orphan photos to a gallery
 */
export async function organizeOrphanPhotos(
  agent: Agent,
  galleryUri: string,
  orphanUris: string[],
  dryRun = false,
  onProgress?: (current: number, total: number) => void,
  onLog?: (level: string, message: string) => void,
): Promise<{ success: number; errors: number }> {
  const logger = onLog
    ? {
        info: (msg: string) => onLog("info", msg),
        warn: (msg: string) => onLog("warn", msg),
        error: (msg: string) => onLog("error", msg),
        debug: (msg: string) => onLog("debug", msg),
      }
    : log;

  let success = 0;
  let errors = 0;

  for (let i = 0; i < orphanUris.length; i++) {
    const photoUri = orphanUris[i];
    onProgress?.(i + 1, orphanUris.length);

    // Extract createdAt from photo URI's rkey (TID)
    const createdAt = new Date().toISOString(); // Fallback

    try {
      logger.info(`Adding photo to gallery...`);
      const result = await createGalleryItem(
        agent,
        galleryUri,
        photoUri,
        i,
        createdAt,
        dryRun,
      );

      if (result.success) {
        success++;
      } else {
        errors++;
        logger.error(`Failed: ${result.error}`);
      }
    } catch (error) {
      errors++;
      logger.error(`Error: ${error}`);
    }
  }

  return { success, errors };
}

/**
 * Image dimensions helper for browser Blobs
 */
async function getImageDimensionsFromBlob(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return getImageDimensionsBrowser(uint8Array);
}

/**
 * Run the full import process in browser
 * Supports gallery selection, batch limiting, state persistence, and alt text override
 */
export async function runImport(
  agent: Agent,
  file: File,
  dryRun: boolean,
  galleryUri: string | null,
  batchSize: number = 800,
  altOverride?: string,
  onProgress?: (current: number, total: number) => void,
  onLog?: (level: string, message: string) => void,
  existingState?: BrowserImportState,
  onStateUpdate?: (state: BrowserImportState) => void,
  target: Target = "grain",
): Promise<{
  success: number;
  errors: number;
  photosImported: number;
  galleryItemsCreated: number;
  state?: BrowserImportState;
  dailyLimitReached?: boolean;
}> {
  const logger = onLog
    ? {
        info: (msg: string) => onLog("info", msg),
        warn: (msg: string) => onLog("warn", msg),
        error: (msg: string) => onLog("error", msg),
      }
    : log;

  try {
    logger.info("Parsing Instagram export...");
    const posts = await parseExportFromFile(file);

    const validPosts = posts.filter((p) => !p.skipped);
    logger.info(`Found ${validPosts.length} posts to import`);

    // Check for existing photos/posts to skip duplicates
    logger.info(
      `Checking for existing ${target === "spark" ? "Spark posts" : "photos"}...`,
    );
    const existingPhotos =
      target === "spark"
        ? await getExistingSparkPosts(agent)
        : await getExistingPhotos(agent);
    const existingStories =
      target === "spark"
        ? await getExistingSparkStories(agent)
        : new Set<string>();
    logger.info(
      `Found ${existingPhotos.size} existing ${target === "spark" ? "posts" : "photos"}${existingStories.size > 0 ? `, ${existingStories.size} stories` : ""}`,
    );

    // Initialize or resume state
    let state: BrowserImportState | undefined;
    let galleryTitle = "Unknown Gallery";

    if (existingState && existingState.galleryUri === galleryUri) {
      state = existingState;
      galleryTitle = existingState.galleryTitle;

      // Check if new day - reset daily counter
      if (new Date() >= new Date(state.dailyResetAt)) {
        state = updateBrowserForNewDay(state);
      }

      // Check if daily limit already reached
      if (isBrowserDailyLimitReached(state, batchSize)) {
        logger.warn(
          `Daily limit of ${batchSize} already reached for this session.`,
        );
        logger.warn(
          `Resets at: ${new Date(state.dailyResetAt).toLocaleString()}`,
        );
        return {
          success: 0,
          errors: 0,
          photosImported: 0,
          galleryItemsCreated: 0,
          state,
          dailyLimitReached: true,
        };
      }

      logger.info(
        `Resuming import: ${state.importedTimestamps.length} already imported`,
      );
    } else if (galleryUri) {
      // Try to get gallery title
      const galleries = await getExistingGalleries(agent);
      const gallery = galleries.find((g) => g.uri === galleryUri);
      galleryTitle = gallery?.title || "Unknown Gallery";

      state = createBrowserImportState(
        file,
        galleryUri,
        galleryTitle,
        validPosts.length,
        batchSize,
        target,
      );
      saveBrowserImportState(state);
    }

    // Filter out already processed posts
    let postsToProcess = validPosts;
    if (state) {
      const processedSet = new Set([
        ...state.importedTimestamps,
        ...state.skippedTimestamps,
        ...state.failedTimestamps,
      ]);
      postsToProcess = validPosts.filter(
        (p) => !processedSet.has(p.createdAt.toISOString()),
      );
      logger.info(`${postsToProcess.length} posts remaining to import`);
    }

    let photosImported = 0;
    let galleryItemsCreated = 0;
    let errors = 0;
    let galleryPosition = state?.importedTimestamps.length ?? 0;
    let batchCount = state?.dailyImported ?? 0;
    let dailyLimitReached = false;

    // Helper for alt text
    const getAltText = (caption?: string): string => {
      if (altOverride) return altOverride;
      return caption || "";
    };

    // Track progress for state updates
    const trackProgress = (
      timestamp: string,
      status: "imported" | "skipped" | "failed",
    ) => {
      if (!state) return;

      if (status === "imported") {
        state.importedTimestamps.push(timestamp);
        state.dailyImported++;
        state.lastImportAt = new Date().toISOString();
      } else if (status === "skipped") {
        state.skippedTimestamps.push(timestamp);
      } else {
        state.failedTimestamps.push(timestamp);
      }

      // Save state periodically (every 10 posts)
      if (state.importedTimestamps.length % 10 === 0) {
        saveBrowserImportState(state);
        onStateUpdate?.(state);
      }
    };

    for (let i = 0; i < postsToProcess.length; i++) {
      const post = postsToProcess[i];
      const timestamp = post.createdAt.toISOString();

      // Skip duplicates (check against the right dedup set)
      const isStory = post.isStory ?? false;
      const dedupSet =
        target === "spark" && isStory ? existingStories : existingPhotos;
      if (dedupSet.has(timestamp)) {
        trackProgress(timestamp, "skipped");
        logger.info(
          `Skipping duplicate ${isStory ? "story" : "post"}: ${timestamp}`,
        );
        continue;
      }

      // Skip stories for Grain (not supported)
      if (target === "grain" && isStory) {
        trackProgress(timestamp, "skipped");
        logger.info(
          `Skipping story (Grain does not support stories): ${timestamp}`,
        );
        continue;
      }

      // Skip video posts for Grain (not supported)
      if (target === "grain" && post.media.some((m) => m.type === "video")) {
        trackProgress(timestamp, "skipped");
        logger.info(
          `Skipping video post (Grain does not support videos): ${timestamp}`,
        );
        continue;
      }

      // Check batch/daily limit
      if (batchCount >= batchSize) {
        logger.warn(
          `Reached daily limit of ${batchSize}. Stopping to avoid rate limits.`,
        );
        logger.warn("Progress saved. Refresh the page tomorrow to continue.");
        dailyLimitReached = true;

        // Save final state
        if (state) {
          saveBrowserImportState(state);
          onStateUpdate?.(state);
        }
        break;
      }

      onProgress?.(i + 1, postsToProcess.length);

      for (const media of post.media) {
        if (target === "spark") {
          // Spark: handle stories, videos, and image posts

          // Check for video media
          const videoMedia = post.media.find(
            (m) => m.type === "video" && m.data,
          );

          if (videoMedia?.data) {
            // Video post/story
            try {
              const videoData = new Uint8Array(
                await videoMedia.data!.arrayBuffer(),
              );
              const uploadResult = await uploadSparkVideo(
                agent,
                videoData,
                videoMedia.data!.type || "video/mp4",
              );

              if (!uploadResult.success || !uploadResult.blob) {
                errors++;
                trackProgress(timestamp, "failed");
                logger.error(`Failed to upload video: ${uploadResult.error}`);
                break;
              }

              // Get video dimensions
              const videoDims = await getVideoDimensionsBrowser(
                videoMedia.data!,
              );
              const aspectRatio = {
                width: videoDims.width,
                height: videoDims.height,
              };

              if (isStory) {
                const { publishSparkVideoStory } =
                  await import("./spark-story-publisher.js");
                const result = await publishSparkVideoStory(
                  agent,
                  uploadResult.blob,
                  getAltText(post.caption),
                  aspectRatio,
                  timestamp,
                  dryRun,
                );

                if (result.success) {
                  photosImported++;
                  batchCount++;
                  trackProgress(timestamp, "imported");
                } else {
                  errors++;
                  trackProgress(timestamp, "failed");
                  logger.error(
                    `Failed to publish video story: ${result.error}`,
                  );
                }
              } else {
                const result = await publishSparkVideoPost(
                  agent,
                  uploadResult.blob,
                  getAltText(post.caption),
                  aspectRatio,
                  timestamp,
                  post.caption,
                  dryRun,
                );

                if (result.success) {
                  photosImported++;
                  batchCount++;
                  trackProgress(timestamp, "imported");
                } else {
                  errors++;
                  trackProgress(timestamp, "failed");
                  logger.error(`Failed to publish video post: ${result.error}`);
                }
              }
            } catch (error) {
              errors++;
              trackProgress(timestamp, "failed");
              logger.error(`Error processing video: ${error}`);
            }
            break; // Process all media for this post in one go
          }

          // Image-only post/story
          if (media.type === "image" && media.data) {
            // Collect all images for this post, then publish as one Spark post/story
            const imageItems: Array<{
              data: Uint8Array;
              mimeType: string;
              size: number;
              alt: string;
              aspectRatio?: SparkAspectRatio;
            }> = [];

            for (const m of post.media) {
              if (m.type === "image" && m.data) {
                try {
                  const dims = await getImageDimensionsFromBlob(m.data);
                  imageItems.push({
                    data: new Uint8Array(await m.data.arrayBuffer()),
                    mimeType: m.data.type || "image/jpeg",
                    size: m.data.size,
                    alt: getAltText(post.caption),
                    aspectRatio: dims,
                  });
                } catch (error) {
                  logger.error(`Error loading image: ${error}`);
                }
              }
            }

            if (imageItems.length === 0) {
              errors++;
              trackProgress(timestamp, "failed");
              break;
            }

            try {
              let result;
              if (isStory) {
                result = await publishSparkStory(
                  agent,
                  imageItems.slice(0, 12),
                  timestamp,
                  dryRun,
                );
              } else {
                result = await publishSparkPost(
                  agent,
                  imageItems.slice(0, 12),
                  timestamp,
                  post.caption,
                  dryRun,
                );
              }

              if (result.success) {
                photosImported++;
                batchCount++;
                trackProgress(timestamp, "imported");
              } else {
                errors++;
                trackProgress(timestamp, "failed");
                logger.error(
                  `Failed to publish ${isStory ? "story" : "post"}: ${result.error}`,
                );
              }
            } catch (error) {
              errors++;
              trackProgress(timestamp, "failed");
              logger.error(
                `Error publishing Spark ${isStory ? "story" : "post"}: ${error}`,
              );
            }
            break; // Process all media for this post in one go
          }
        } else {
          // Grain: one photo per record
          if (media.type === "image" && media.data) {
            try {
              // Get actual dimensions
              const dims = await getImageDimensionsFromBlob(media.data);

              logger.info(
                `Publishing photo from ${post.createdAt.toLocaleDateString()}`,
              );
              const result = await publishPhotoFromBlob(
                agent,
                media.data,
                dims,
                timestamp,
                getAltText(post.caption),
                dryRun,
              );

              if (result.success) {
                photosImported++;
                batchCount++;
                trackProgress(timestamp, "imported");

                // Create gallery item if gallery selected
                if (galleryUri && result.uri) {
                  const itemResult = await createGalleryItem(
                    agent,
                    galleryUri,
                    result.uri,
                    galleryPosition,
                    timestamp,
                    dryRun,
                  );

                  if (itemResult.success) {
                    galleryItemsCreated++;
                    galleryPosition++;
                  } else {
                    logger.error(
                      `Failed to create gallery item: ${itemResult.error}`,
                    );
                  }
                }
              } else {
                errors++;
                trackProgress(timestamp, "failed");
                logger.error(`Failed to publish: ${result.error}`);
              }
            } catch (error) {
              errors++;
              trackProgress(timestamp, "failed");
              logger.error(`Error publishing photo: ${error}`);
            }
          }
        }
      }
    }

    // Final state save
    if (state) {
      saveBrowserImportState(state);
      onStateUpdate?.(state);
    }

    if (!dryRun && photosImported > 0) {
      try {
        await agent.com.atproto.repo.createRecord({
          repo: agent.did!,
          collection: 'click.croft.toolkit.use',
          record: {
            $type: 'click.croft.toolkit.use',
            tool: {
              $type: 'click.croft.tools.jasper',
              recordsImported: photosImported,
            },
            createdAt: new Date().toISOString()
          }
        });
      } catch (err) {
        logger.warn(`Failed to log toolkit usage: ${(err as Error).message}`);
      }
    }

    return {
      success: photosImported,
      errors,
      photosImported,
      galleryItemsCreated,
      state,
      dailyLimitReached,
    };
  } catch (error) {
    logger.error(`Import failed: ${error}`);
    throw error;
  }
}
