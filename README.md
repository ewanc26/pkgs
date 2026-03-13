# pkgs

Ewan's personal package monorepo — managed with [pnpm workspaces](https://pnpm.io/workspaces) (TypeScript/Svelte) and [Cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html) + [Nix flake](https://nixos.wiki/wiki/Flakes) (Rust).

## Packages

| Package | Lang | Description |
|---|---|---|
| [`@ewanc26/tid`](./packages/tid) | TypeScript | Zero-dependency AT Protocol TID generation |
| [`@ewanc26/atproto`](./packages/atproto) | TypeScript | AT Protocol service layer |
| [`@ewanc26/ui`](./packages/ui) | Svelte | Svelte UI component library |
| [`@ewanc26/utils`](./packages/utils) | TypeScript | Shared utility functions |
| [`@ewanc26/svelte-standard-site`](./packages/svelte-standard-site) | Svelte | SvelteKit library for site.standard.* AT Protocol records |
| [`@ewanc26/tangled-sync`](./packages/tangled-sync) | TypeScript | CLI tool for syncing GitHub repos to Tangled with ATProto record publishing |
| [`nix-config-tools`](./packages/nix-config-tools) | Rust | Nix config management tools (flake-bump, gen-diff, health-check, server-config) |

## Setup

```bash
# TypeScript/Svelte packages
pnpm install

# Rust/Nix packages (no install needed — run directly)
nix run github:ewanc26/pkgs#flake-bump
nix run github:ewanc26/pkgs#gen-diff
nix run github:ewanc26/pkgs#health-check
nix run github:ewanc26/pkgs#server-config
```

## Common commands

### TypeScript/Svelte

```bash
# Build all packages
pnpm build

# Type-check all packages
pnpm check

# Test all packages
pnpm test

# Work on a single package
pnpm --filter @ewanc26/tid build
pnpm --filter @ewanc26/svelte-standard-site dev
```

### Rust/Nix

```bash
# Build (via Nix)
nix build .#nix-config-tools

# Build (via Cargo, for development)
cargo build --workspace

# Local run (uncommitted changes)
nix run ./packages/nix-config-tools#flake-bump
```

## License

AGPL-3.0-only (TypeScript/Svelte) · MIT (Rust)
