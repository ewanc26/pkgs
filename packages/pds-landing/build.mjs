import { copyFileSync, cpSync, mkdirSync, renameSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const dist = 'dist'
mkdirSync(dist, { recursive: true })
mkdirSync(join(dist, 'assets'), { recursive: true })

// Bundle TypeScript → dist/script.js (IIFE so the browser needs no module loader)
execSync('npx tsup src/script.ts --format iife --globalName pdsLanding --outDir dist --no-dts --clean', {
  stdio: 'inherit',
})

// tsup names IIFE output script.global.js — rename to script.js
renameSync(join(dist, 'script.global.js'), join(dist, 'script.js'))

// Compile Tailwind CSS
execSync(
  'npx tailwindcss --config tailwind.config.js --input styles/input.css --output dist/style.css --minify',
  { stdio: 'inherit' }
)

// Copy static files
copyFileSync('index.html', join(dist, 'index.html'))

// Copy assets
cpSync('assets', join(dist, 'assets'), { recursive: true })

console.log('pds-landing built →', dist)
