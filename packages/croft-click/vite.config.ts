import adapter from '@sveltejs/adapter-vercel';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit({
			adapter: adapter({ runtime: 'nodejs22.x' })
		})],

	server: {
		host: '127.0.0.1',
		port: 5175
	},

	build: {
		target: 'es2022'
	}
});
