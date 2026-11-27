# @ewanc26/tui

The [Ink](https://github.com/vadimdemedes/ink) terminal interface shared by the
pkgs command-line importers: menus, text and password fields, confirmations,
progress with time left, and a countdown for rate-limit waits.

It does not take over a program. Logging through `console` keeps working and is
printed above the live area.

```ts
import { shouldUseTui } from '@ewanc26/tui/detect';

if (shouldUseTui()) {
  const { createTui } = await import('@ewanc26/tui');
  const tui = createTui({ onInterrupt: () => process.emit('SIGINT', 'SIGINT') });
  const target = await tui.select('Import to', [{ value: 'grain', label: 'Grain' }]);
  if (await tui.confirm(`Import to ${target}?`)) tui.progress({ label: 'Importing', done: 0, total: 10 });
  await tui.close(); // the process stays open until this is called
}
```

`shouldUseTui` is false for pipes, CI, `TERM=dumb`, `--no-tui` and
`--non-interactive`, and importing it does not load Ink or React.

Requires Node 22 or later.
