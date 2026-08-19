// Re-export shared constants from the @ewanc26/malachite package.
// Keep this file free of side-effects so it stays tree-shakeable.
export { RECORD_TYPE, SLINGSHOT_RESOLVER, MAX_PDS_BATCH_SIZE, POINTS_PER_RECORD } from '@ewanc26/croft-click-core';

// __CLI_VERSION__ is injected at build time by vite.config.ts → define.__CLI_VERSION__.
// The submission agent tracks the shared @ewanc26/malachite (CLI) version, since
// that package is what actually implements the import logic this web UI delegates to.
declare const __CLI_VERSION__: string;
export const CLIENT_AGENT = `malachite/v${__CLI_VERSION__} (web)`;
