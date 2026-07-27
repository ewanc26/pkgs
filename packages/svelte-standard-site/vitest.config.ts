import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	test: {
		globals: true,
		environment: 'jsdom',
		// Only run source tests — dist/ and .svelte-kit/ hold prebuilt copies
		// of the same *.test.ts files and would otherwise run twice.
		exclude: ['**/node_modules/**', '**/dist/**', '**/.svelte-kit/**']
	}
});
