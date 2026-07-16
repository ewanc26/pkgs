# pkgs

Ewan's personal package monorepo — TypeScript/Svelte packages managed with [pnpm workspaces](https://pnpm.io/workspaces), Rust tools via [Cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) + [Nix flake](https://nixos.wiki/wiki/Flakes), and Python utilities.

Full documentation at **[docs.ewancroft.uk](https://docs.ewancroft.uk/projects/pkgs)**.

> 🧶 Also available on [Tangled](https://tangled.org/ewancroft.uk/pkgs)

## Packages

| Package                                                            | Description                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [`@ewanc26/tid`](./packages/tid)                                   | Zero-dependency AT Protocol TID generation                           |
| [`@ewanc26/atproto`](./packages/atproto)                           | AT Protocol service layer                                            |
| [`@ewanc26/ui`](./packages/ui)                                     | Svelte UI component library                                          |
| [`@ewanc26/utils`](./packages/utils)                               | Shared utility functions                                             |
| [`@ewanc26/noise`](./packages/noise)                               | Deterministic value-noise generation                                 |
| [`@ewanc26/noise-avatar`](./packages/noise-avatar)                 | Noise-based avatar generation                                        |
| [`@ewanc26/bismuth`](./packages/bismuth)                           | Convert `pub.leaflet` / `site.standard.document` records to Markdown |
| [`@ewanc26/svelte-standard-site`](./packages/svelte-standard-site) | SvelteKit library for `site.standard.*` AT Protocol records          |
| [`@ewanc26/pds-landing`](./packages/pds-landing)                   | Svelte components for an AT Protocol PDS landing page                |
| [`@ewanc26/supporters`](./packages/supporters)                     | Ko-fi supporter display backed by AT Protocol                        |
| [`@ewanc26/wafrn-theme`](./packages/wafrn-theme)                   | WAFRN CSS theme — Catppuccin terminal aesthetic                      |
| [`@ewanc26/tangled-sync`](./packages/tangled-sync)                 | CLI for syncing GitHub repos to Tangled                              |
| [`malachite`](./packages/malachite)                                | Last.fm/Spotify → AT Protocol scrobble importer (CLI)                |
| [`malachite-web`](./packages/malachite-web)                        | Last.fm/Spotify → AT Protocol scrobble importer (web frontend, private) |
| [`nix-config-tools`](./packages/nix-config-tools)                  | Nix config management tools (Rust)                                   |
| [`llm-analyser`](./packages/llm-analyser)                          | `.docx` analysis with Ollama (Python)                                |

## Licence

AGPL-3.0-only (TypeScript/Svelte) · MIT (Rust)
