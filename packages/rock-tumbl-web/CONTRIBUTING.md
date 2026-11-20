# Contributing to rock-tumbl-web

Web frontend for the rock-tumbl starter package. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- CS runs type-check, tests, and web checks for the rock-tumbl pair — keep them green from the repo root before opening a PR.
- Sign-in and toolkit usage logging live here; auth changes need testing with both flows.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
