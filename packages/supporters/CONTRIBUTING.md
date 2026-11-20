# Contributing to supporters

Ko-fi supporter display backed by AT Protocol records. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Supporter records follow the `uk.ewancroft.support.kofi` lexicon (the package carries its own `lexicons/` definitions) — keep record shapes, display code, and lexicons in step with each other.
- Treat supporter data with care in code and screenshots: no personal details in tests or logs.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
