import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const webPkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
const cliPkg = JSON.parse(readFileSync(resolve('../jasper/package.json'), 'utf-8'));

// The publishers shared with the CLI also reach Node-only modules: the file
// logger (`fs`/`os`, which makes Vercel's file tracer walk the build machine's
// filesystem) and the `sharp` image utilities (a native module that cannot be
// bundled). Swap in the browser versions.
const jasperNodeModules: Record<string, string> = {
	'../utils/logger.js': 'browser-logger.js',
	'./image-utils.js': 'browser-image-utils.js'
};

const jasperBrowserModules: Plugin = {
	name: 'jasper-browser-modules',
	enforce: 'pre',
	resolveId(source, importer) {
		const replacement = jasperNodeModules[source];
		if (replacement && importer?.includes('/jasper/dist/lib/')) {
			return resolve('../jasper/dist/lib', replacement);
		}
	}
};

export default defineConfig({
	plugins: [jasperBrowserModules, tailwindcss(), sveltekit()],

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
