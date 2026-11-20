# Contributing to jasper

CLI to import Instagram photos, stories, and videos to the AT Protocol network (Grain or Spark records). It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Privacy-sensitive by nature: never log tokens, credentials, or user content by default, and see [PRIVACY.md](PRIVACY.md) before changing anything that touches exports.
- When adding or changing import behaviour, verify against a small sample export and a scratch PDS account.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
