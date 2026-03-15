// Re-export shared constants from the @ewanc26/malachite package.
// Keep this file free of side-effects so it stays tree-shakeable.
export { RECORD_TYPE, SLINGSHOT_RESOLVER, MAX_PDS_BATCH_SIZE, POINTS_PER_RECORD } from '@ewanc26/malachite/core';

// __WEB_VERSION__ is injected at build time by vite.config.ts → define.__WEB_VERSION__
declare const __WEB_VERSION__: string;
export const CLIENT_AGENT = `malachite/v${__WEB_VERSION__} (web)`;
