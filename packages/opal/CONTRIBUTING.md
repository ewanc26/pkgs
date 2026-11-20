# Contributing to opal

CLI to convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Source-format mapping is documented in [MAPPING.md](MAPPING.md) — update it whenever the mapping changes; it's the reference for what lossy conversions are expected.
- When adding field mappings, prefer explicit choices over silent drops: unhandled source fields should either be mapped or clearly documented as dropped.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
