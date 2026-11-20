# Contributing to croft-click

The [croft.click](https://croft.click) site itself: the hub for all the tools (SvelteKit, deployed on Vercel). It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- The app consumes shared workspace packages (`croft-click-core`, `landing-ui`, `ui`), so after changing interface details, verify this app still builds (`vercel.json` config and all).
- The package carries its own `lexicons/` and `docs/` directories — record-shape changes should land with matching docs updates.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
