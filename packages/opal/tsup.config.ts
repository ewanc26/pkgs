import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  format: ['esm', 'cjs'],
  dts: { resolve: true },
  clean: true,
  sourcemap: true,
  splitting: false,
});
