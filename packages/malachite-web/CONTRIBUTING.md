# Contributing to malachite-web

Web frontend for Malachite, deployed at [malachite.croft.click](https://malachite.croft.click). It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- The dev server must run at `127.0.0.1:5173` exactly — the ATProto OAuth loopback `redirect_uri` is pinned to that origin (RFC 8252). Don't change the host or port without also updating `src/lib/core/oauth.ts`.
- Non-UI Malachite logic belongs in `packages/malachite/src/core/`; this app re-exports it via the `$core` alias, so don't duplicate import/dedupe/pacing logic here.
- Sign-in supports both AT Protocol OAuth and app passwords — test auth changes both ways.
- Read [../malachite/CONTRIBUTING.md](../malachite/CONTRIBUTING.md) for the shared architecture and contracts.
- Run this package's scripts from this directory (see `package.json`) or from the repo root with `pnpm --filter <package-name> <script>`.
