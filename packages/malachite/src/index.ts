#!/usr/bin/env node

import { handleSelfUpdate } from '@ewanc26/self-update';
import { runCLI } from './lib/cli.js';

const updateExit = await handleSelfUpdate({ packageName: '@ewanc26/malachite', from: import.meta.url });
if (updateExit !== null) process.exit(updateExit);
runCLI();