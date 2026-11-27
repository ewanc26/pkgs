/** The questions rock-tumbl asks at a terminal when run without arguments. */
import { existsSync } from 'node:fs'
import type { Tui } from '@ewanc26/tui'
import { cleanPathInput } from '@ewanc26/tui/path'

/** The command-line arguments equivalent to the answers given. */
export async function runWizard(tui: Tui): Promise<string[]> {
  const input = cleanPathInput(
    await tui.input('Tumblr export, a ZIP or extracted folder (you can drag it in):', {
      validate: (answer) => {
        const path = cleanPathInput(answer)
        if (!path) return 'Enter the path to your export'
        return existsSync(path) ? null : `Nothing found at ${path}`
      },
    }),
  )
  const action = await tui.select('What should happen next?', [
    { value: 'convert', label: 'Convert to a JSON file', hint: 'No sign-in needed' },
    { value: 'publish', label: 'Publish to Standard.site', hint: 'Asks again before writing' },
  ])
  const site = (
    await tui.input('Publication URL, or an existing publication AT URI:', {
      validate: (answer) =>
        /^(https?|at):\/\/\S+$/.test(answer.trim()) ? null : 'Start with https:// or at://',
    })
  ).trim()

  const argv = ['--input', input, '--site', site]
  if (await tui.confirm('Include private and draft posts?', false)) argv.push('--include-private')

  if (action === 'convert') {
    const output = cleanPathInput(
      await tui.input('Save the converted documents to:', {
        validate: (answer) => (answer.trim() ? null : 'Enter a file name'),
      }),
    )
    return [...argv, '--output', output]
  }

  argv.push('--publish')
  if (!site.startsWith('at://') && (await tui.confirm('Create a new publication for this URL?', false))) {
    const name = await tui.input('Publication name:', {
      validate: (answer) => (answer.trim() ? null : 'Enter a name'),
    })
    argv.push('--create-publication', '--publication-name', name.trim())
  }
  if (await tui.confirm('Upload the images and media your posts use?', true)) argv.push('--upload-media')
  return argv
}
