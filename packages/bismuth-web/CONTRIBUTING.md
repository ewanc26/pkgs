# Contributing to bismuth-web

Web frontend for Bismuth, deployed at [bismuth.croft.click](https://bismuth.croft.click). It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Part of the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo and the [croft.click](https://croft.click) toolkit.
- Conversion logic belongs in the `bismuth` package, not duplicated here — this app is the UI surface for it.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
