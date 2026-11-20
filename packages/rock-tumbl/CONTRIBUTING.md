# Contributing to rock-tumbl

Starter package for rock-tumbl. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Paired with [rock-tumbl-web](../rock-tumbl-web) — CI runs type-check, tests, and web checks for this pair, so keep both green when you change shared behaviour.
- As a starter package, its shape is documentation too: avoid creeping structure that a fresh user couldn't follow.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
