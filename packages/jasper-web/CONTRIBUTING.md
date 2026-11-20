# Contributing to jasper-web

Web frontend for Jasper, deployed at [jasper.croft.click](https://jasper.croft.click). It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Importer logic belongs in the `jasper` package; keep this app the UI surface.
- Same privacy rules as the CLI apply: no tokens, credentials, or user content in logs or errors.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
