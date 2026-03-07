# pkgs

Ewan's personal package monorepo — language-agnostic, supporting TypeScript ([pnpm workspaces](https://pnpm.io/workspaces)) and Rust ([Cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)).

## Packages

### TypeScript

| Package | Description |
|---|---|
| [`@ewanc26/tid`](./packages/tid) | Zero-dependency AT Protocol TID generation |
| [`@ewanc26/atproto`](./packages/atproto) | AT Protocol service layer |
| [`@ewanc26/ui`](./packages/ui) | Svelte UI component library |
| [`@ewanc26/utils`](./packages/utils) | Shared utility functions |
| [`@ewanc26/svelte-standard-site`](./packages/svelte-standard-site) | SvelteKit library for site.standard.* AT Protocol records |
| [`@ewanc26/tangled-sync`](./packages/tangled-sync) | CLI tool for syncing GitHub repos to Tangled with ATProto records |

### Rust

| Package | Description |
|---|---|
| [`nix-config-tools`](./packages/nix-config-tools) | Management tools for nixos/nix-darwin configuration (flake-bump, health-check, gen-diff, server-config) |

### Python

| Package | Description |
|---|---|
| [`llm-analyser`](./packages/llm-analyser) | Document analysis tool using Ollama LLM |

## Setup

### TypeScript

```bash
pnpm install
```

### Rust

No special setup needed; build/run via Cargo:

```bash
cargo build --release -p nix-config-tools
cargo run -p nix-config-tools --bin flake-bump -- --help
```

## Common commands

### TypeScript

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

### Rust

```bash
# Build all Rust packages
cargo build --release

# Build a specific tool
cargo build -p nix-config-tools --bin health-check

# Run a tool
cargo run -p nix-config-tools --bin flake-bump -- --update nixpkgs
```

### Python

```bash
# Install Python dependencies
pnpm py:install

# Check Python syntax
pnpm py:check

# Run a Python tool
cd packages/llm-analyser && python3 main.py
```

## License

AGPL-3.0-only
