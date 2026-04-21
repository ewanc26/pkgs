/**
 * Browser-compatible import state persistence
 * Uses localStorage to store import progress for resumable sessions
 */

/**
 * Browser import state (subset of ImportState for localStorage)
 */
export interface BrowserImportState {
  /** File name for display */
  fileName: string;
  /** File size for verification */
  fileSize: number;
  /** File last modified timestamp */
  fileLastModified: number;
  /** Gallery URI */
  galleryUri: string;
  /** Gallery title */
  galleryTitle: string;
  /** Total posts found */
  totalPosts: number;
  /** ISO timestamps of imported posts */
  importedTimestamps: string[];
  /** ISO timestamps of skipped posts */
  skippedTimestamps: string[];
  /** ISO timestamps of failed posts */
  failedTimestamps: string[];
  /** When this session was created */
  createdAt: string;
  /** When the last import occurred */
  lastImportAt: string | null;
  /** Posts imported today */
  dailyImported: number;
  /** When daily counter resets */
  dailyResetAt: string;
}

const STORAGE_KEY = 'jasper_import_state';

/**
 * Save import state to localStorage
 */
export function saveBrowserImportState(state: BrowserImportState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save import state:', error);
  }
}

/**
 * Load import state from localStorage
 */
export function loadBrowserImportState(): BrowserImportState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as BrowserImportState;

    // Check if state is too old (older than 30 days)
    const createdAt = new Date(state.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (createdAt < thirtyDaysAgo) {
      clearBrowserImportState();
      return null;
    }

    return state;
  } catch (error) {
    console.warn('Failed to load import state:', error);
    return null;
  }
}

/**
 * Clear import state from localStorage
 */
export function clearBrowserImportState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear import state:', error);
  }
}

/**
 * Check if the uploaded file matches the saved state
 */
export function fileMatchesState(
  file: File,
  state: BrowserImportState
): boolean {
  return (
    file.name === state.fileName &&
    file.size === state.fileSize &&
    file.lastModified === state.fileLastModified
  );
}

/**
 * Create a new browser import state
 */
export function createBrowserImportState(
  file: File,
  galleryUri: string,
  galleryTitle: string,
  totalPosts: number,
  _dailyLimit: number
): BrowserImportState {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    fileName: file.name,
    fileSize: file.size,
    fileLastModified: file.lastModified,
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
export function isBrowserDailyLimitReached(
  state: BrowserImportState,
  dailyLimit: number
): boolean {
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
export function updateBrowserForNewDay(state: BrowserImportState): BrowserImportState {
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
export function getBrowserRemainingPosts(state: BrowserImportState): number {
  const imported = new Set(state.importedTimestamps);
  const skipped = new Set(state.skippedTimestamps);
  const failed = new Set(state.failedTimestamps);
  const processed = imported.size + skipped.size + failed.size;
  return state.totalPosts - processed;
}

/**
 * Format state for display
 */
export function formatBrowserImportStateSummary(state: BrowserImportState): string {
  const remaining = getBrowserRemainingPosts(state);
  const imported = state.importedTimestamps.length;
  const skipped = state.skippedTimestamps.length;

  return [
    `File: ${state.fileName}`,
    `Gallery: ${state.galleryTitle}`,
    `Progress: ${imported} imported, ${skipped} skipped`,
    `Remaining: ${remaining} posts`,
    `Today: ${state.dailyImported} imported`,
  ].join('\n');
}
