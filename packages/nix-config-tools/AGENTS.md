# AGENTS.md

## Purpose
`nix-config-tools` is a collection of Rust CLI utilities for maintaining Ewan Croft's NixOS and nix-darwin infrastructure. It is a Rust workspace, not an npm package.

## Architectural Concepts
- **Rust / Cargo**: Built with `cargo build`. Each binary is a standalone tool under `src/bin/`.
- **Shared Library**: Common logic lives in `src/lib.rs` (compiled as `tools_common`).
- **Nix Flake**: `flake.nix` provides a reproducible dev shell and build environment.
- **Supporting Scripts**: `check-darwin.sh` and `history_dumper.py` are standalone shell/Python helpers not part of the Rust build.

## Core Files
- `src/bin/flake-bump.rs`: Bumps `flake.lock` inputs interactively.
- `src/bin/gen-diff.rs`: Generates a human-readable NixOS config diff.
- `src/bin/health-check.rs`: Checks the health of self-hosted services.
- `src/bin/server-config.rs`: Interactive server configuration helper.
- `src/lib.rs`: Shared utilities used across binaries.
- `flake.nix`: Nix dev shell and build definition.

## Instructions for Agents
- Build with `cargo build` or `nix build` inside the flake environment.
- Do not add npm or Node.js tooling — this is a pure Rust project.
- Several tools listed in `Cargo.toml` comments have been intentionally removed; do not reinstate them.
- When adding a new binary, register it as `[[bin]]` in `Cargo.toml` and add shared logic to `src/lib.rs`.
