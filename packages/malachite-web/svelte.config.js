import adapter from '@sveltejs/adapter-vercel';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({ runtime: 'nodejs22.x' }),
    alias: {
      // Shared, environment-agnostic core — single source of truth.
      // CLI uses src/core/ directly; web imports via this alias so there is
      // no duplicated logic.
      $core: resolve(__dirname, '../malachite/src/core'),
    },
  },
};

export default config;
