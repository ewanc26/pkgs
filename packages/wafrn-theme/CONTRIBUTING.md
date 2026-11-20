# Contributing to wafrn-theme

WAFRN CSS theme with a Catppuccin terminal aesthetic. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- It's a drop-in theme, so changes should stay CSS/token-level; keep the Catppuccin palette consistent across components.
- A small package by design — resist adding build tooling unless there's a real need.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
