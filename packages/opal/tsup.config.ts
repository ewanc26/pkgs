import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: { resolve: true },
    clean: true,
    sourcemap: true,
    splitting: false,
  },
  // The CLI is ESM only: it awaits the self-update hook at the top level.
  {
    entry: ['src/bin.ts'],
    format: ['esm'],
    sourcemap: true,
    splitting: false,
  },
]);
