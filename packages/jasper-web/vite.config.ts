import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const webPkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
const cliPkg = JSON.parse(readFileSync(resolve('../jasper/package.json'), 'utf-8'));

// The publishers shared with the CLI import its file logger, which pulls Node's
// `fs` and `os` into the server bundle and makes Vercel's file tracer walk the
// build machine's filesystem. Swap in the browser logger instead.
const jasperBrowserLogger: Plugin = {
	name: 'jasper-browser-logger',
	enforce: 'pre',
	resolveId(source, importer) {
		if (source === '../utils/logger.js' && importer?.includes('/jasper/dist/lib/')) {
			return resolve('../jasper/dist/lib/browser-logger.js');
		}
	}
};

export default defineConfig({
	plugins: [jasperBrowserLogger, tailwindcss(), sveltekit()],

	server: {
		host: '127.0.0.1',
		port: 5174
	},

	define: {
		global: 'globalThis',
		__WEB_VERSION__: JSON.stringify(webPkg.version),
		__CLI_VERSION__: JSON.stringify(cliPkg.version)
	},

	optimizeDeps: {
		include: ['@atproto/common-web']
	},

	build: {
		target: 'es2022',
		chunkSizeWarningLimit: 2000
	}
});
