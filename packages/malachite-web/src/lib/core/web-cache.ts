/**
 * Web-specific caching for the malachite import wizard.
 * Uses sessionStorage for records cache (per-tab, survives page reload)
 * and localStorage for credentials (persists across sessions).
 *
 * All operations are wrapped in try-catch so cache failures never block
 * the import flow — everything falls back to re-fetching gracefully.
 */

// ─── Import state (sessionStorage) ─────────────────────────────────────────

const KEY_IMPORT_STATE = 'malachite:import-state';
const KEY_RESUME      = 'malachite:resume';

export interface SavedImportState {
  mode: string;
  recordsProcessed: number;
  totalRecords: number;
  timestamp: number;
}

export function saveImportState(state: SavedImportState): void {
  try {
    sessionStorage.setItem(KEY_IMPORT_STATE, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable — silently ignore.
  }
}

export function loadImportState(): SavedImportState | null {
  try {
    const raw = sessionStorage.getItem(KEY_IMPORT_STATE);
    if (!raw) return null;
    return JSON.parse(raw) as SavedImportState;
  } catch {
    return null;
  }
}

export function clearImportState(): void {
  try { sessionStorage.removeItem(KEY_IMPORT_STATE); } catch { /* ignore */ }
}

/** Resume offset — the number of records already published in a previous session. */
export function saveResumeOffset(offset: number): void {
  try { sessionStorage.setItem(KEY_RESUME, String(offset)); } catch { /* ignore */ }
}

export function loadResumeOffset(): number {
  try { return Number(sessionStorage.getItem(KEY_RESUME)) || 0; } finally { clearResumeOffset(); }
}

export function clearResumeOffset(): void {
  try { sessionStorage.removeItem(KEY_RESUME); } catch { /* ignore */ }
}

// ─── Records cache (sessionStorage, 24h TTL) ──────────────────────────────

const KEY_CACHE_PREFIX = 'malachite:records:';
const RECORDS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface RecordsCacheEntry {
  v: number;
  did: string;
  ts: number;
  entries: Array<[string, { uri: string; cid: string; value: unknown }]>;
}

function recordsCacheKey(did: string): string {
  return KEY_CACHE_PREFIX + did;
}

/**
 * Save a map of existing records to sessionStorage keyed by user DID.
 * Silently fails if storage is full — import continues with a re-fetch.
 */
export function saveRecordsCache(
  did: string,
  recordsMap: Map<string, { uri: string; cid: string; value: unknown }>,
): void {
  try {
    const cache: RecordsCacheEntry = {
      v: 1,
      did,
      ts: Date.now(),
      entries: Array.from(recordsMap.entries()),
    };
    sessionStorage.setItem(recordsCacheKey(did), JSON.stringify(cache));
  } catch {
    /* storage full — ignore */
  }
}

/**
 * Load cached records for the given DID.
 * Returns null if no cache exists, TTL expired, or DID mismatch.
 */
export function loadRecordsCache(
  did: string,
): Map<string, { uri: string; cid: string; value: unknown }> | null {
  try {
    const raw = sessionStorage.getItem(recordsCacheKey(did));
    if (!raw) return null;
    const cache: RecordsCacheEntry = JSON.parse(raw);
    if (cache.v !== 1 || cache.did !== did || Date.now() - cache.ts > RECORDS_CACHE_TTL) {
      sessionStorage.removeItem(recordsCacheKey(did));
      return null;
    }
    return new Map(cache.entries);
  } catch {
    return null;
  }
}

export function clearRecordsCache(did?: string): void {
  try {
    if (did) {
      sessionStorage.removeItem(recordsCacheKey(did));
    }
  } catch { /* ignore */ }
}

// ─── Credential persistence (localStorage, 7-day TTL) ─────────────────────

const KEY_CREDENTIALS = 'malachite:credentials';
const CREDENTIALS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SavedCredentials {
  handle: string;
  /** base64-encoded password (not encryption — avoids casual shoulder-surfing) */
  password: string;
  timestamp: number;
}

/**
 * Save app-password credentials to localStorage.
 * Base64 is NOT encryption — it provides transport-level obscurity on top
 * of HTTPS origin isolation.  This mirrors the CLI's encrypted credentials
 * at a pragmatic level for the web (no Web Crypto ceremony needed).
 */
export function saveCredentials(handle: string, password: string): void {
  try {
    const data: SavedCredentials = {
      handle,
      password: btoa(password),
      timestamp: Date.now(),
    };
    localStorage.setItem(KEY_CREDENTIALS, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function loadCredentials(): { handle: string; password: string } | null {
  try {
    const raw = localStorage.getItem(KEY_CREDENTIALS);
    if (!raw) return null;
    const data: SavedCredentials = JSON.parse(raw);
    if (Date.now() - data.timestamp > CREDENTIALS_TTL) {
      localStorage.removeItem(KEY_CREDENTIALS);
      return null;
    }
    return { handle: data.handle, password: atob(data.password) };
  } catch { return null; }
}

export function hasSavedCredentials(): boolean {
  try { return localStorage.getItem(KEY_CREDENTIALS) !== null; }
  catch { return false; }
}

export function getSavedHandle(): string | null {
  try {
    const raw = localStorage.getItem(KEY_CREDENTIALS);
    if (!raw) return null;
    return (JSON.parse(raw) as SavedCredentials).handle;
  } catch { return null; }
}

export function clearSavedCredentials(): void {
  try { localStorage.removeItem(KEY_CREDENTIALS); } catch { /* ignore */ }
}
