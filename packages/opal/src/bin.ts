#!/usr/bin/env node

import { handleSelfUpdate } from '@ewanc26/self-update';
import { runCLI } from './cli.js';

const updateExit = await handleSelfUpdate({ packageName: '@ewanc26/opal', from: import.meta.url });
if (updateExit !== null) process.exit(updateExit);
runCLI();
