#!/usr/bin/env node

import { handleSelfUpdate } from '@ewanc26/self-update';
import { exit } from '@ewanc26/tui/session';
import { runCLI } from './cli.js';

const updateExit = await handleSelfUpdate({ packageName: '@ewanc26/opal', from: import.meta.url });
if (updateExit !== null) process.exit(updateExit);
runCLI().catch(async (error: Error) => {
  console.error(`Error: ${error.message}`);
  await exit(1);
});
