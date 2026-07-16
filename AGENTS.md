# AGENTS.md

Guidance for agents working on `pkgs`, the canonical personal package monorepo spanning TypeScript/Svelte, Rust/Nix, and Python utilities.

## Workspace boundaries

- `packages/` contains independently published packages; read each package README/manifest before editing.
- pnpm workspaces own JavaScript packages; Cargo workspace members own Rust code; Python packages keep their own entry points/dependencies.
- `scripts/`, `publish.sh`, and `release.sh` coordinate releases. Publication is an external side effect and requires explicit version/package review.
- Standalone repos marked archived/canonical-to-pkgs should not receive duplicate implementation changes.

## Rules

- Use pnpm and preserve `pnpm-lock.yaml`; do not add npm/Yarn lockfiles.
- Keep public exports, package names, peer dependencies, CLIs, and serialized formats backward-compatible or document intentional breaks.
- Avoid cross-package imports through source-relative paths; use declared workspace package boundaries.
- Never publish, bump all packages, or run destructive clean/release scripts as routine validation.
- Keep AT Protocol lexicons/types generated from their declared source and preserve wire compatibility.

## Validation

Run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` for affected JS packages; run Cargo fmt/clippy/test for Rust members and `pnpm py:check` plus package tests for Python. Use package-level checks during iteration, then affected dependents. Review package tarballs/exports before any requested release.
