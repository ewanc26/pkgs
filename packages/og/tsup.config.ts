import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/templates/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	clean: true,
	sourcemap: true,
	platform: 'node',
	target: 'es2022',
	external: ['satori', '@resvg/resvg-js', '@ewanc26/noise'],
	esbuildOptions(options) {
		options.jsxFactory = 'h'
		options.jsxFragment = 'Fragment'
	},
	onSuccess: async () => {
		// Copy font files to dist after build
		const { mkdir, cp } = await import('node:fs/promises')
		const { resolve } = await import('node:path')
		const fontsDir = resolve('fonts')
		const distFontsDir = resolve('dist/fonts')
		await mkdir(distFontsDir, { recursive: true })
		await cp(fontsDir, distFontsDir, { recursive: true })
	},
})
