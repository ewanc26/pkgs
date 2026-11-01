import { runCLI } from './cli.js'

runCLI().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
