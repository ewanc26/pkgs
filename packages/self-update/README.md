# @ewanc26/self-update

Update notice and `self-update` command for the `@ewanc26` command-line tools.

```ts
import { handleSelfUpdate } from '@ewanc26/self-update';

const code = await handleSelfUpdate({ packageName: '@ewanc26/opal', from: import.meta.url });
if (code !== null) process.exit(code);
```

## What it does

- `<tool> self-update` installs the newest version; `<tool> self-update --check`
  only reports it.
- The newest version is the higher of npm's `latest` and the newest GitHub release
  of `ewanc26/pkgs` tagged `<tool>-vX.Y.Z` that carries the `npm pack` tarball.
  npm wins a tie.
- Only global npm, pnpm and Bun installs are updated. Source checkouts, linked
  installs, project dependencies and `npx` runs are left alone.
- Other commands print a notice when a newer version is cached. The cache is
  refreshed by a detached process at most once a day.

## Turning the notice off

Set `EWANC26_NO_UPDATE_CHECK` or `NO_UPDATE_NOTIFIER`. It is also off when `CI` is
set or stderr is not a terminal.

A tarball installed from GitHub is trusted on the strength of HTTPS and the
repository's release permissions; it is not separately signed.
