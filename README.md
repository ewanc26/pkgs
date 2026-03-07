# pkgs

Ewan's personal package monorepo — managed with [pnpm workspaces](https://pnpm.io/workspaces).

## Packages

| Package | Description |
|---|---|
| [`@ewanc26/tid`](./packages/tid) | Zero-dependency AT Protocol TID generation |
| [`@ewanc26/atproto`](./packages/atproto) | AT Protocol service layer |
| [`@ewanc26/ui`](./packages/ui) | Svelte UI component library |
| [`@ewanc26/utils`](./packages/utils) | Shared utility functions |

## Setup

```bash
pnpm install
```

## Common commands

```bash
# Build all packages
pnpm build

# Type-check all packages
pnpm check

# Build a single package
pnpm --filter @ewanc26/tid build
```

## License

AGPL-3.0-only
