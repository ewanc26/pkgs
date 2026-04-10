import { generateOgImage } from './dist/index.js'
import { writeFile } from 'node:fs/promises'

const colors = {
  background: '#0f1a15',
  text: '#e8f5e9',
  accent: '#86efac',
}

// Generate with noise circle decoration
const result = await generateOgImage({
  title: "Ewan's Corner",
  description: 'personal site, blog, and digital garden',
  siteName: 'ewancroft.uk',
  template: 'default',
  colors,
  noise: { enabled: true, opacity: 0.08 },
  width: 1200,
  height: 630,
})

await writeFile('./preview-noise-circle.png', result)
console.log('Generated:', result.length, 'bytes')
