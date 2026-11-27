import { exit } from '@ewanc26/tui/session'
import { runCLI } from './cli.js'

runCLI().catch((err: unknown) => {
  console.error(err)
  return exit(1)
})
