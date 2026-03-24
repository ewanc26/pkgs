import { defineConfig } from 'tsup'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig([
  // ── Library (index) ─────────────────────────────────────────────────────
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    define: {
      __BISMUTH_VERSION__: JSON.stringify(pkg.version),
    },
  },
  // ── CLI binary ───────────────────────────────────────────────────────────
  {
    entry: { bin: 'src/bin.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
    define: {
      __BISMUTH_VERSION__: JSON.stringify(pkg.version),
    },
  },
  // ── Tests (built for node --test) ────────────────────────────────────────
  {
    entry: { 'tests/bismuth.test': 'src/tests/bismuth.test.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    platform: 'node',
    noBundle: true,
    removeNodeProtocol: false,
    define: {
      __BISMUTH_VERSION__: JSON.stringify(pkg.version),
    },
  },
])
