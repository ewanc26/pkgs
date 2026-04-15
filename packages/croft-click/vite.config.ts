import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	server: {
		host: '127.0.0.1',
		port: 5175,
	},

	define: {
		global: 'globalThis',
	},

	build: {
		target: 'es2022',
	}
});
