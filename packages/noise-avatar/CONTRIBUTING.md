# Contributing to noise-avatar

Noise-based avatar generation. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- This package ships a committed `dist/` build — when you change `src/`, rebuild so the committed output stays in sync with the source.
- Avatars must stay deterministic (see `noise`): same seed, same avatar.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
