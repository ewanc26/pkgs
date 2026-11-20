# Contributing to pkgs

Thank you for wanting to help! This is a spare-time project with one core maintainer, and the recent attention on [Malachite](https://malachite.croft.click) has grown the issue queue faster than it can be worked through alone. Every contribution is genuinely appreciated: fixes, documentation, triaging fresh issues, and well-written bug reports all count.

The workflow in this file applies to the whole monorepo. Each package in `packages/` has its own `CONTRIBUTING.md` with package-specific notes, so start there once you know which package you want to work on. If you want to help with Malachite in particular, read [packages/malachite/CONTRIBUTING.md](packages/malachite/CONTRIBUTING.md) first — it covers the CLI/web architecture, the dev-mode flags, and the rate-limiting contract in depth.

## Where help is needed right now

Issues live in this repository. Current queue, friendliest first:

1. **[#98 — duplicate records on Sync re-attempts](https://github.com/ewanc26/pkgs/issues/98)** *(bug, core logic)* — stopping a run mid-import and restarting creates duplicates; the second run's sync check appears to skip far fewer records than were actually posted. Likely the existing-records snapshot (CAR export cache) is stale or undercounted after an interruption. A reproduction exists in the issue, and the sync-check log excerpt is the starting point.
2. **[#93 — Last.fm import fails](https://github.com/ewanc26/pkgs/issues/93)** *(bug)* — needs a reproduction with logs before any fix is possible.
3. **[#88 — cross-post imported scrobbles to rocksky lexicons](https://github.com/ewanc26/pkgs/issues/88)** *(feature)* — mapping `fm.teal.feed.play` records onto rocksky's lexicons during import.
4. **[#72 — Deezer listening-history import](https://github.com/ewanc26/pkgs/issues/72)** *(research, good first issue)* — investigate what Deezer export offers and write up findings in the issue before any code.
5. **[#96 — hosted service for high-volume operations](https://github.com/ewanc26/pkgs/issues/96)** *(design discussion)* — comments welcome; also see [#64](https://github.com/ewanc26/pkgs/issues/64) for the sustainable-hosting angle.
6. **[#65 — AT Protocol Spaces support](https://github.com/ewanc26/pkgs/issues/65)** — explicitly waiting on upstream; don't start this one yet.

If an issue is a question or a design discussion, reply in the issue; if it's a bug or a small feature, comment that you'd like to take it and reference the issue number in your PR so work doesn't get duplicated.

## Repository layout

- **TypeScript/Svelte packages** in `packages/*`, managed with [pnpm workspaces](https://pnpm.io/workspaces).
- The browser-based [croft.click](https://croft.click) tools (Malachite, Opal, Jasper, Bismuth, Tourmaline) each pair an importer/CLI package with a `*-web` SvelteKit frontend.
- **Rust** tools (`nix-config-tools`) via Cargo + Nix flake. **Python** utilities (`llm-analyser`) alongside.
- Documentation for all the projects lives in the [`docsite` repository](https://github.com/ewanc26/docsite): Markdown sources in `src/content/documentation/`, rendered at [docs.ewancroft.uk](https://docs.ewancroft.uk/projects/pkgs). Docs fixes and additions are PRs to that repo — it has its own [CONTRIBUTING.md](https://github.com/ewanc26/docsite/blob/main/CONTRIBUTING.md).
- Web apps deploy to Vercel (some on Cloudflare) and sign users in with AT Protocol OAuth.

## Development setup

You'll need **Node.js 24.x** and **pnpm ≥ 9** (the engines field pins these).

```sh
git clone https://github.com/ewanc26/pkgs.git
cd pkgs
pnpm install
pnpm build        # builds all workspace packages
```

The checks CI expects, runnable for the whole repo:

```sh
pnpm typecheck    # tsc --noEmit across every package
pnpm test         # builds then runs each package's tests
pnpm check        # per-package checks
```

To work on one package, run its scripts from its directory, or scope from the root with `pnpm --fil
ter <package-name> <script>`.

### A safe test account, please

Never test import, sync, or deduplicate runs against an AT Protocol repository you care about. Spin up a throwaway account on any PDS and use a small sample file, so you can inspect (and, if needed, clean up) records with a tool like `pdsls`. The `deduplicate` mode is dry-run first and asks for confirmation, but you should still be comfortable with the plan it shows before you confirm deletions.

## Commit style

Follow the existing conventional-commit style, scoped to the package you touched: `fix(malachite): …`, `feat(malachite-web): …`, `docs: …`, `ci(rock-tumbl): …`. Keep commits focused and reference issue numbers (`Closes #98`) so fixes stay attached to their issue.

## Before you open a pull request

- `pnpm typecheck` passes for the packages you touched.
- Tests pass (`pnpm test`, or the package's own `pnpm test`).
- If you changed behaviour shared between a CLI and its `*-web` sibling, you verified **both** surfaces.
- If the change writes to a PDS, you verified against a scratch account, not your own repo.
- The PR is focused: one issue or one coherent change. Drive-by formatting of unrelated files goes in a separate commit or stays out.
- Describe how you verified the change (what you ran, what you saw). "Verified with a 1,600-record sample CSV against a test account, CLI + web" is worth more than a lengthy explanation.

### AI-assisted contributions

A lot of this repo's history involves AI pair-programming, so AI-assisted PRs are entirely welcome. Two asks: be able to explain and stand behind every line you submit, and actually run the verification steps rather than assuming the model's output is correct. Unverified generated code creates more issue-queue work than it removes.

## Reporting a bug

Please include:

- **Version info** — for the croft.click tools, both the web version and CLI version (e.g. `web v0.11.0, cli v0.21.0`).
- **What you did** — exact steps, including any interruptio
n (like pressing Stop mid-sync) and retry.
- **What happened vs. what you expected.**
- **Logs** — for import tools, especially the `── Sync Check ──` section.
- **Where to look** — your handle plus the collection (e.g. `fm.teal.feed.play`), so records can be inspected with `pdsls`.
- A small sample of the source export (a few CSV lines or equivalent) if you can share one.

## Communication and conduct

- **Comment on an issue before large work.** For anything beyond a small fix, post your plan first; it avoids duplicate effort and wasted rework.
- **Be kind.** This is a spare-time project. Ask questions in the issue thread and keep it friendly.
- **User reports about the croft.click tools and Teal surface in the teal.fm Discord**; developer coordination happens in GitHub issues.

## Licences and trademarks

TypeScript/Svelte packages are **AGPL-3.0-only** (Rust tools are MIT). By submitting a contribution you agree it's licensed under the same terms; if that's a problem for something you want to contribute, raise it before you build it.

"AT Protocol" and related terms are trademarks of Bluesky Social PBC. This project is independent and not affiliated with or endorsed by Bluesky Social PBC. Keep that nuance in mind when writing docs or naming things, and see [TRADEMARKS.md](TRADEMARKS.md).

## Other ways to help

Code isn't the only contribution. Triage a fresh issue (try to reproduce it, note what you find), improve the docs in [ewanc26/docsite](https://github.com/ewanc26/docsite) (see its [CONTRIBUTING.md](https://github.com/ewanc26/docsite/blob/main/CONTRIBUTING.md)), answer questions from new users, star the repo, or point someone at [croft.click](https://croft.click). If the tools are useful to you, [Ko-fi](https://ko-fi.com/ewancroft), [Liberapay](https://liberapay.com/ewancroft/), or [GitHub Sponsors](https://github.com/sponsors/ewanc26) keep the lights on.

Thank you for helping! 💚
