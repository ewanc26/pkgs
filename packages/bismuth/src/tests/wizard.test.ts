import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Tui } from '@ewanc26/tui'
import { runWizard } from '../wizard.js'

const answering = (answers: unknown[]) => {
  const next = async () => answers.shift()
  return { input: next, select: next, confirm: next } as unknown as Tui
}

describe('bismuth wizard', () => {
  it('builds a fetch command', async () => {
    const argv = await runWizard(answering(['fetch', ' did:plc:abc ', '3xyz', '', false]))
    assert.deepEqual(argv, ['fetch', '--did', 'did:plc:abc', '--rkey', '3xyz', '--no-frontmatter'])
  })

  it('builds a conversion command that prints to the terminal', async () => {
    const argv = await runWizard(answering(['convert', 'package.json', true, '']))
    assert.deepEqual(argv, ['package.json', '--frontmatter'])
  })
})
