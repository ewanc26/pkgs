# Contributing to noise

Deterministic value-noise generation. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Determinism is the point: the same input must always produce the same output. If a change alters generated values for existing inputs, say so loudly in the PR, because downstream visuals (avatars, art) will shift for everyone.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
