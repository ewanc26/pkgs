/**
 * Shared constants — environment-agnostic.
 * No Node.js dependencies; safe for both CLI and browser.
 */

// New records use the production collection; the legacy collection is read for deduplication only.
export const RECORD_TYPE = 'fm.teal.feed.play';
export const LEGACY_RECORD_TYPE = 'fm.teal.alpha.feed.play';
export const RECORD_TYPES = [RECORD_TYPE, LEGACY_RECORD_TYPE] as const;
export const SLINGSHOT_RESOLVER = 'https://slingshot.microcosm.blue';
export const MAX_PDS_BATCH_SIZE = 200;
export const POINTS_PER_RECORD = 3;
