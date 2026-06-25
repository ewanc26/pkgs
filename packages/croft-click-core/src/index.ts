/**
 * Public library surface for @ewanc26/malachite/core.
 *
 * Re-exports everything environment-agnostic from the core so that consumers
 * (e.g. malachite-web) can import a single subpath instead of reaching into
 * individual source modules.
 *
 * Note: SpotifyRecord is intentionally exported only via types.ts — spotify.ts
 * re-declares it as a convenience export but types.ts is the canonical source,
 * so we only pull the functions from spotify.ts to avoid a duplicate export.
 */

export * from './apple-music.js';
export * from './auth.js';
export * from './car-fetch.js';
export * from './config.js';
export * from './csv.js';
export * from './dynamic-batch-calculator.js';
export * from './merge.js';
export * from './proactive-rate-pacer.js';
export * from './publisher.js';
export * from './retry-helper.js';
export * from './rate-limit-headers.js';
export * from './rate-limiter.js';
export { parseSpotifyJsonContent, convertSpotifyToPlayRecord } from './spotify.js';
export * from './sync.js';
export * from './tid.js';
export * from './types.js';
export * from './youtube-music.js';
