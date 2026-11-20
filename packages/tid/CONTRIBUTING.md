# Contributing to tid

Standalone, published npm package ([`@ewanc26/tid`](https://www.npmjs.com/package/@ewanc26/tid)) for zero-dependency AT Protocol TID generation. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- It is published to npm, so API changes are semver obligations: patch for fixes, minor for new exports, major for breaking changes. Bump and publish deliberately.
- Zero runtime dependencies is a hard constraint — keep it that way.
- If TID generation changes elsewhere in the monorepo (for example malachite's `src/core/tid.ts`), update this package to match so the two never drift.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
