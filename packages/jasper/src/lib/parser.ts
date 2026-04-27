/**
 * Instagram export parser
 * Handles ZIP files and directories, parses posts_1.json with encoding fixes
 */
import fs from "fs";
import path from "path";
import {
  BlobReader,
  BlobWriter,
  TextWriter,
  ZipReader,
  type EntryMetaData,
  type FileEntry,
} from "@zip.js/zip.js";
import type {
  InstagramExportPost,
  ParsedPost,
  ParsedMedia,
} from "../core/types.js";
import { POSTS_JSON_PATHS, STORIES_JSON_PATHS } from "../core/config.js";
import { log } from "../utils/logger.js";

/**
 * Fix Facebook/Instagram's broken UTF-8 encoding
 * See: https://sorashi.github.io/fix-facebook-json-archive-encoding
 * See: https://github.com/pixelfed/pixelfed/pull/4726
 */
export function fixFacebookEncoding(str: string): string {
  // Replace \\u00XX sequences with actual characters
  const replaced = str.replace(/\\u00([a-f0-9]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  // Convert to proper UTF-8
  const buffer = Array.from(replaced, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(new Uint8Array(buffer));
}

/**
 * Check if a path is a ZIP file
 */
export function isZipFile(inputPath: string): boolean {
  return inputPath.toLowerCase().endsWith(".zip");
}

/**
 * Get the file extension from a path
 */
function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
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
 * Convert Unix timestamp (seconds) to Date
 */
function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Generate a unique ID from timestamp
 */
function generateId(timestamp: number): string {
  return `instagram-${timestamp}`;
}

/**
 * Parse a single Instagram post
 */
function parsePost(
  post: InstagramExportPost,
  basePath: string,
  isZip: boolean,
  isStory = false,
): ParsedPost {
  // Use post-level timestamp or first media's timestamp
  const timestamp =
    post.creation_timestamp ||
    post.media[0]?.creation_timestamp ||
    Date.now() / 1000;
  const createdAt = timestampToDate(timestamp);

  const media: ParsedMedia[] = [];

  for (const m of post.media) {
    const mediaType = getMediaType(m.uri);

    media.push({
      path: isZip ? m.uri : path.join(basePath, m.uri),
      type: mediaType,
      originalUri: m.uri,
      timestamp: timestampToDate(m.creation_timestamp || timestamp),
    });
  }

  return {
    id: generateId(timestamp),
    caption: post.title,
    createdAt,
    media,
    isStory,
  };
}

/**
 * Parse posts from JSON content
 */
function parsePostsJson(
  jsonString: string,
  basePath: string,
  isZip: boolean,
  isStory = false,
): ParsedPost[] {
  // Fix encoding
  const fixed = fixFacebookEncoding(jsonString);
  let data: InstagramExportPost | InstagramExportPost[];

  try {
    data = JSON.parse(fixed);
  } catch (e) {
    log.error("Failed to parse JSON:", e);
    return [];
  }

  // Sometimes the JSON isn't an array when there's only one post
  const posts = Array.isArray(data) ? data : [data];

  return posts.map((post) => parsePost(post, basePath, isZip, isStory));
}

type ZipEntry = EntryMetaData & { directory?: boolean };

/**
 * Find posts_1.json in ZIP entries
 */
function findPostsJsonInZip(entries: ZipEntry[]): FileEntry | undefined {
  for (const p of POSTS_JSON_PATHS) {
    const entry = entries.find((e) => e.filename === p);
    // Check if it's a file entry (not a directory)
    if (entry && !entry.directory) {
      return entry as FileEntry;
    }
  }
  return undefined;
}

/**
 * Find stories_1.json in ZIP entries
 */
function findStoriesJsonInZip(entries: ZipEntry[]): FileEntry | undefined {
  for (const p of STORIES_JSON_PATHS) {
    const entry = entries.find((e) => e.filename === p);
    if (entry && !entry.directory) {
      return entry as FileEntry;
    }
  }
  return undefined;
}

/**
 * Filter entries to only file entries
 */
function filterFileEntries(entries: ZipEntry[]): FileEntry[] {
  return entries.filter((e) => !e.directory) as FileEntry[];
}

/**
 * Parse Instagram export from a ZIP file
 */
export async function parseZipExport(zipPath: string): Promise<ParsedPost[]> {
  log.info(`Reading ZIP file: ${zipPath}`);

  const fileBuffer = fs.readFileSync(zipPath);
  const data = new Blob([fileBuffer]);
  const zipReader = new ZipReader(new BlobReader(data));
  const entries = (await zipReader.getEntries()) as ZipEntry[];

  // Find posts_1.json
  const postsEntry = findPostsJsonInZip(entries);
  if (!postsEntry) {
    await zipReader.close();
    throw new Error("posts_1.json not found in ZIP archive");
  }

  log.debug(`Found posts_1.json at: ${postsEntry.filename}`);

  // Extract and parse posts
  const postsText = await postsEntry.getData(new TextWriter());
  const posts = parsePostsJson(postsText, "", true);

  // Find and parse stories_1.json (optional)
  const storiesEntry = findStoriesJsonInZip(entries);
  if (storiesEntry) {
    log.debug(`Found stories_1.json at: ${storiesEntry.filename}`);
    const storiesText = await storiesEntry.getData(new TextWriter());
    const stories = parsePostsJson(storiesText, "", true, true);
    posts.push(...stories);
    log.info(`Found ${stories.length} stories`);
  }

  await zipReader.close();
  return posts;
}

/**
 * Parse Instagram export from a directory
 */
export async function parseDirectoryExport(
  dirPath: string,
): Promise<ParsedPost[]> {
  log.info(`Reading directory: ${dirPath}`);

  // Find posts_1.json
  let postsPath: string | undefined;
  for (const p of POSTS_JSON_PATHS) {
    const fullPath = path.join(dirPath, p);
    if (fs.existsSync(fullPath)) {
      postsPath = fullPath;
      break;
    }
  }

  if (!postsPath) {
    throw new Error("posts_1.json not found in directory");
  }

  log.debug(`Found posts_1.json at: ${postsPath}`);

  // Read and parse posts
  const postsString = fs.readFileSync(postsPath, "utf-8");
  const posts = parsePostsJson(postsString, dirPath, false);

  // Find and parse stories_1.json (optional)
  for (const p of STORIES_JSON_PATHS) {
    const fullPath = path.join(dirPath, p);
    if (fs.existsSync(fullPath)) {
      log.debug(`Found stories_1.json at: ${fullPath}`);
      const storiesString = fs.readFileSync(fullPath, "utf-8");
      const stories = parsePostsJson(storiesString, dirPath, false, true);
      posts.push(...stories);
      log.info(`Found ${stories.length} stories`);
      break;
    }
  }

  return posts;
}

/**
 * Parse Instagram export (ZIP or directory)
 */
export async function parseExport(inputPath: string): Promise<ParsedPost[]> {
  const absolutePath = path.resolve(inputPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }

  if (isZipFile(absolutePath)) {
    return parseZipExport(absolutePath);
  }

  if (fs.statSync(absolutePath).isDirectory()) {
    return parseDirectoryExport(absolutePath);
  }

  throw new Error(`Expected a ZIP file or directory, got: ${absolutePath}`);
}

/**
 * Load media data from a file path (for non-ZIP exports)
 */
export async function loadMediaFromPath(filePath: string): Promise<Buffer> {
  return fs.promises.readFile(filePath);
}

/**
 * Load media data from a ZIP entry
 */
export async function loadMediaFromZip(
  zipPath: string,
  entryPath: string,
): Promise<Buffer> {
  const fileBuffer = fs.readFileSync(zipPath);
  const data = new Blob([fileBuffer]);
  const zipReader = new ZipReader(new BlobReader(data));
  const entries = (await zipReader.getEntries()) as ZipEntry[];

  // Find the file entry
  const fileEntries = filterFileEntries(entries);
  const entry = fileEntries.find((e) => e.filename === entryPath);

  if (!entry) {
    await zipReader.close();
    throw new Error(`Media file not found in ZIP: ${entryPath}`);
  }

  const blob = await entry.getData(new BlobWriter("application/octet-stream"));
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await zipReader.close();
  return buffer;
}
