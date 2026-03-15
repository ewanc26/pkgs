import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path'; // used for package.json reads below

const webPkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
const cliPkg = JSON.parse(readFileSync(resolve('../malachite/package.json'), 'utf-8'));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	server: {
		host: '127.0.0.1',
		port: 5173,
	},

	define: {
		global: 'globalThis',
		__WEB_VERSION__: JSON.stringify(webPkg.version),
		__CLI_VERSION__: JSON.stringify(cliPkg.version)
	},

	optimizeDeps: {
		include: ['@atproto/api', '@atproto/common-web']
	},

	build: {
		target: 'es2022',
		// The /import page chunk is large because it bundles @atproto/api, the OAuth
		// client, and the IPLD/CAR parser — all unavoidable for an ATProto import tool.
		// The page is client-only (ssr=false, prerender=false) so it's never on the
		// critical path; gzipped it's ~350 kB which is acceptable.
		chunkSizeWarningLimit: 2000
	}
});