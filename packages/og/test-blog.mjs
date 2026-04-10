#!/usr/bin/env node
/**
 * Test script to generate blog template OG image.
 */

import { generateOgImage } from './dist/index.js'
import { writeFile } from 'node:fs/promises'

const png = await generateOgImage({
	title: 'Building a Personal Web',
	description: 'How I approach building websites that last.',
	siteName: 'ewancroft.uk',
	template: 'blog',
	colors: {
		background: '#0a0a0f',
		text: '#ffffff',
		accent: '#00d4ff',
	},
})

await writeFile('./test-blog.png', png)
console.log('Generated test-blog.png')
console.log(`Size: ${png.length} bytes`)
