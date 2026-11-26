import { handleSelfUpdate } from '@ewanc26/self-update';
import { main } from './cli.js'

const updateExit = await handleSelfUpdate({ packageName: '@ewanc26/bismuth', from: import.meta.url });
if (updateExit !== null) process.exit(updateExit);
main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
