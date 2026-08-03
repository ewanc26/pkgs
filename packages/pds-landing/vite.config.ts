import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  server: {
    host: '127.0.0.1',
    port: 13213
  },
  build: {
    target: 'esnext'
  }
});
