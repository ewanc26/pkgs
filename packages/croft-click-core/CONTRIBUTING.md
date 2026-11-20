# Contributing to croft-click-core

Shared, environment-agnostic core used by the croft.click importers: dedupe keys, record keys, pacing, and other logic that must behave identically in Node CLIs and browsers. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- The same contract as malachite's core applies: no Node.js-specific or browser-specific APIs (Web Crypto via `globalThis.crypto` is fine), and progress/logging through callbacks rather than direct `console` calls.
- The dedupe key (normalized artist, normalized track, canonical timestamp) is shared vocabulary across importers — changing it changes what counts as the same listen everywhere at once, so it deserves an issue-first discussion.
- New logic here needs tests; the importers it powers write to real users' PDS repos.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
