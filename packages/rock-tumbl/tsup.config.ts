import { defineConfig } from 'tsup'

export default defineConfig([
  // ── Library (index) ─────────────────────────────────────────────────────
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
  },
  // ── CLI binary ──────────────────────────────────────────────────────────
  {
    entry: { bin: 'src/bin.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
  },
  // ── Tests (built for node --test) ───────────────────────────────────────
  {
    entry: { 'tests/rock-tumbl.test': 'src/tests/rock-tumbl.test.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    platform: 'node',
    noBundle: true,
    removeNodeProtocol: false,
  },
])
