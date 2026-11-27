import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/tests/*.test.ts'],
  format: ['esm'],
  outDir: '.test-dist',
  clean: true,
  // `node:test` has no unprefixed alias.
  removeNodeProtocol: false,
});
