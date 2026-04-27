/**
 * Import state persistence for resumable imports
 * Stores progress in ~/.jasper/imports/ for large exports
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";
import type { ImportState, Target } from "../core/types.js";
import { IMPORT_STATE_DIR } from "../core/config.js";
import { log } from "../utils/logger.js";

/**
 * Get the import state directory path
 */
function getImportStateDir(): string {
  return path.join(os.homedir(), IMPORT_STATE_DIR);
}

/**
 * Get the state file path for an export
 */
function getStateFilePath(exportPath: string): string {
  const hash = hashExportPath(exportPath);
  return path.join(getImportStateDir(), `${hash}.json`);
}

/**
 * Create a short hash from export path for filename
 */
function hashExportPath(exportPath: string): string {
  return crypto
    .createHash("sha256")
    .update(path.resolve(exportPath))
    .digest("hex")
    .substring(0, 16);
}

/**
 * Compute SHA-256 hash of export file contents
 */
export async function hashExportContents(exportPath: string): Promise<string> {
  const absolutePath = path.resolve(exportPath);
  const stat = fs.statSync(absolutePath);

  // For directories, hash the posts_1.json file
  if (stat.isDirectory()) {
    const postsJson = findPostsJson(absolutePath);
    if (postsJson) {
      return hashFile(postsJson);
    }
    // Fallback to hashing directory name + mtime
    const mtime = fs.statSync(absolutePath).mtime.getTime();
    return crypto
      .createHash("sha256")
      .update(`${absolutePath}:${mtime}`)
      .digest("hex");
  }

  // For ZIP files, hash the file contents
  return hashFile(absolutePath);
}

/**
 * Find posts_1.json in a directory
 */
function findPostsJson(dir: string): string | null {
  const possiblePaths = [
    path.join(dir, "your_instagram_activity/content/posts_1.json"),
    path.join(dir, "your_instagram_activity/media/posts_1.json"),
    path.join(dir, "content/posts_1.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Hash a file's contents
 */
async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Ensure the import state directory exists
 */
function ensureStateDir(): void {
  const dir = getImportStateDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save import state to disk
 */
export async function saveImportState(state: ImportState): Promise<void> {
  ensureStateDir();
  const filePath = getStateFilePath(state.exportPath);

  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    log.debug(`Saved import state to ${filePath}`);
  } catch (error) {
    log.warn(`Failed to save import state: ${(error as Error).message}`);
  }
}

/**
 * Load import state from disk
 */
export async function loadImportState(
  exportPath: string,
): Promise<ImportState | null> {
  const filePath = getStateFilePath(exportPath);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const state = JSON.parse(content) as ImportState;

    // Verify the export file still exists
    if (!fs.existsSync(path.resolve(state.exportPath))) {
      log.warn("Export file no longer exists at saved path");
      return null;
    }

    return state;
  } catch (error) {
    log.warn(`Failed to load import state: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Verify export hash matches stored state
 */
export async function verifyExportHash(state: ImportState): Promise<boolean> {
  const currentHash = await hashExportContents(state.exportPath);
  return currentHash === state.exportHash;
}

/**
 * List all stored import states
 */
export async function listImportStates(): Promise<ImportState[]> {
  const dir = getImportStateDir();

  if (!fs.existsSync(dir)) {
    return [];
  }

  const states: ImportState[] = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), "utf-8");
      states.push(JSON.parse(content) as ImportState);
    } catch {
      // Skip invalid files
    }
  }

  // Sort by creation date, newest first
  return states.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Clear a specific import state
 */
export async function clearImportState(exportPath: string): Promise<boolean> {
  const filePath = getStateFilePath(exportPath);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }

  return false;
}

/**
 * Clear all import states
 */
export async function clearAllImportStates(): Promise<number> {
  const dir = getImportStateDir();

  if (!fs.existsSync(dir)) {
    return 0;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  let cleared = 0;

  for (const file of files) {
    try {
      fs.unlinkSync(path.join(dir, file));
      cleared++;
    } catch {
      // Skip files that can't be deleted
    }
  }

  return cleared;
}

/**
 * Create a new import state
 */
export function createImportState(
  exportPath: string,
  exportHash: string,
  target: Target,
  galleryUri: string,
  galleryTitle: string,
  totalPosts: number,
  _dailyLimit: number,
): ImportState {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    exportPath: path.resolve(exportPath),
    exportHash,
    target,
    galleryUri,
    galleryTitle,
    totalPosts,
    importedTimestamps: [],
    skippedTimestamps: [],
    failedTimestamps: [],
    createdAt: now.toISOString(),
    lastImportAt: null,
    dailyImported: 0,
    dailyResetAt: tomorrow.toISOString(),
  };
}

/**
 * Check if daily limit has been reached
 */
export function isDailyLimitReached(
  state: ImportState,
  dailyLimit: number,
): boolean {
  // Check if we need to reset the daily counter
  const now = new Date();
  const resetAt = new Date(state.dailyResetAt);

  if (now >= resetAt) {
    return false; // New day, limit not reached
  }

  return state.dailyImported >= dailyLimit;
}

/**
 * Update state for a new day (reset daily counter)
 */
export function updateForNewDay(state: ImportState): ImportState {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    ...state,
    dailyImported: 0,
    dailyResetAt: tomorrow.toISOString(),
  };
}

/**
 * Get remaining posts to import
 */
export function getRemainingPosts(state: ImportState): number {
  const imported = new Set(state.importedTimestamps);
  const skipped = new Set(state.skippedTimestamps);
  const failed = new Set(state.failedTimestamps);
  const processed = imported.size + skipped.size + failed.size;
  return state.totalPosts - processed;
}

/**
 * Format state for display
 */
export function formatImportStateSummary(state: ImportState): string {
  const remaining = getRemainingPosts(state);
  const imported = state.importedTimestamps.length;
  const skipped = state.skippedTimestamps.length;
  const failed = state.failedTimestamps.length;

  return [
    `Export: ${path.basename(state.exportPath)}`,
    `Target: ${state.target === "spark" ? "Spark" : "Grain"}`,
    state.target === "grain" ? `Gallery: ${state.galleryTitle}` : null,
    `Progress: ${imported} imported, ${skipped} skipped, ${failed} failed`,
    `Remaining: ${remaining} posts`,
    `Today: ${state.dailyImported} imported`,
    `Started: ${new Date(state.createdAt).toLocaleDateString()}`,
    state.lastImportAt
      ? `Last import: ${new Date(state.lastImportAt).toLocaleDateString()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
