// Shared implementation — re-exported from the @ewanc26/malachite npm package.
// src/core/tid.ts already uses globalThis.crypto which works in both Node 20+
// and browsers, so no browser-specific shim is needed.
export * from '@ewanc26/malachite/core';
