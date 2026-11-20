# Contributing to atproto

Shared AT Protocol service layer used across the croft.click tools. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Changes here ripple into every tool that talks to a PDS, so run the whole-workspace `pnpm typecheck` and `pnpm test` rather than just this package's checks.
- When adding or changing service-layer behaviour, link the relevant lexicon or AT Protocol spec section in your PR so reviewers can check the contract.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
