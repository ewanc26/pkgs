import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Tui } from '@ewanc26/tui'
import { rateLimitRetry } from '../rate-limit.js'
import { runWizard } from '../wizard.js'

describe('rate-limited publishing', () => {
  it('waits out a 429 and sends the request again', async () => {
    let calls = 0
    const waits: number[] = []
    const send = rateLimitRetry({ retryNow: () => true, onWait: (w) => waits.push(w.totalWaitSeconds) })
    const result = await send(async () => {
      if (++calls === 1) {
        throw Object.assign(new Error('Rate Limit Exceeded'), {
          status: 429,
          headers: new Headers({ 'retry-after': '3600' }),
        })
      }
      return 'ok'
    })
    assert.equal(result, 'ok')
    assert.equal(calls, 2)
    assert.ok(waits[0]! >= 3600)
  })

  it('passes other failures straight through', async () => {
    await assert.rejects(rateLimitRetry()(async () => { throw new Error('bad record') }), /bad record/)
  })
})

describe('rock-tumbl wizard', () => {
  const answering = (answers: unknown[]) => {
    const next = async () => answers.shift()
    return { input: next, select: next, confirm: next } as unknown as Tui
  }

  it('builds a conversion command', async () => {
    const argv = await runWizard(answering(['.', 'convert', 'https://b.example', false, 'out.json']))
    assert.deepEqual(argv, ['--input', '.', '--site', 'https://b.example', '--output', 'out.json'])
  })

  it('builds a publish command with a new publication', async () => {
    const argv = await runWizard(
      answering(['.', 'publish', 'https://b.example', false, true, 'My blog', true]),
    )
    assert.deepEqual(argv.slice(4), [
      '--publish', '--create-publication', '--publication-name', 'My blog', '--upload-media',
    ])
  })
})
