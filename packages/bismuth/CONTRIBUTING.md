# Contributing to bismuth

Converts `pub.leaflet` / `site.standard.document` AT Protocol records to Markdown. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Conversion fidelity is the contract. When changing conversion behaviour, include before/after Markdown samples in the PR so the diff is reviewable.
- Watch out for record-shape drift: the converter should tolerate records that predate optional fields.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
