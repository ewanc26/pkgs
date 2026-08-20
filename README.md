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

## Try the tools

Several of these packages ship as free, browser-based apps — no accounts, no tracking, nothing leaves your machine except to your own PDS. They live at **[croft.click](https://croft.click)**:

| Tool                                              | What it does                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| [Malachite](https://malachite.croft.click)        | Import Last.fm and Spotify listening history into Teal              |
| [Opal](https://opal.croft.click)                  | Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky      |
| [Jasper](https://jasper.croft.click)              | Import Instagram photos, stories, and videos to Grain or Spark      |
| [Bismuth](https://bismuth.croft.click)            | Convert ATProto richtext-block documents to Markdown                |
| [Tourmaline](https://tourmaline.croft.click)      | Analyse your Teal.fm scrobbles and find your listener archetype     |

## Support

All of this is free and open source, built and maintained in my spare time. If any of it is useful to you, a one-off tip or a monthly sponsorship keeps it going:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/ewancroft)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-30363D?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/ewanc26)

Not up for that? Starring the repo, filing a good bug report, or pointing someone at [croft.click](https://croft.click) helps just as much.

## Licence

AGPL-3.0-only (TypeScript/Svelte) · MIT (Rust)
