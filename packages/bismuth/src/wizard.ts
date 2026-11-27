/** The questions bismuth asks at a terminal when run without arguments. */
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Tui } from '@ewanc26/tui'
import { cleanPathInput } from '@ewanc26/tui/path'

/** The command-line arguments equivalent to the answers given. */
export async function runWizard(tui: Tui): Promise<string[]> {
  const required = (what: string) => (answer: string) => (answer.trim() ? null : `Enter ${what}`)
  const task = await tui.select('Bismuth: what would you like to do?', [
    { value: 'convert', label: 'Convert a JSON file to Markdown' },
    { value: 'fetch', label: 'Fetch every document in a publication' },
  ])

  if (task === 'fetch') {
    const did = await tui.input('DID of the repository owner:', {
      validate: (answer) => (answer.trim().startsWith('did:') ? null : 'A DID starts with did:'),
    })
    const rkey = await tui.input('Record key of the publication:', { validate: required('the rkey') })
    const folder = cleanPathInput(
      await tui.input(`Save into (Enter for ${join(homedir(), 'Downloads')}):`),
    )
    const argv = ['fetch', '--did', did.trim(), '--rkey', rkey.trim()]
    if (folder) argv.push('--output-dir', folder)
    if (!(await tui.confirm('Include front matter?', true))) argv.push('--no-frontmatter')
    return argv
  }

  const file = cleanPathInput(
    await tui.input('JSON file to convert (you can drag it in):', {
      validate: (answer) => {
        const path = cleanPathInput(answer)
        return path && existsSync(path) && statSync(path).isFile() ? null : 'Enter an existing file'
      },
    }),
  )
  const argv = [file]
  if (await tui.confirm('Include front matter?', true)) argv.push('--frontmatter')
  const output = cleanPathInput(await tui.input('Save as (Enter to print it here):'))
  if (output) argv.push('--output', output)
  return argv
}
