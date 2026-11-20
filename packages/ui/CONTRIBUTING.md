# Contributing to ui

Svelte component library shared by the web apps. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Several apps consume this library — when you change markup, props, or exports, run the workspace `pnpm build` to check the consumers still compile.
- Prefer additive API changes (new props with defaults) over breaking ones; component changes are de-facto semver relevant to every app in the repo.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
