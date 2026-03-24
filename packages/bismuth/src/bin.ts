#!/usr/bin/env node
import { main } from './cli.js'
main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
