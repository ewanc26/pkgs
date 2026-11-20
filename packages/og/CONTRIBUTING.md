# Contributing to og

Open Graph image generation for the croft.click projects. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Visual output is the product: include a rendered before/after image in your PR when you change generation code.
- The `test-blog.mjs` and `test-noise-circle.mjs` scripts generate sample images — run the one nearest your change to preview output.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
