import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/templates/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	clean: true,
	sourcemap: true,
	platform: 'node',
	target: 'es2022',
	shims: true,
	external: ['satori', '@resvg/resvg-js', '@ewanc26/noise'],
	esbuildOptions(options) {
		options.jsxFactory = 'h'
		options.jsxFragment = 'Fragment'
	},
})
