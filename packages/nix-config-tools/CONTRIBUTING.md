# Contributing to nix-config-tools

Nix config management tools, written in Rust (Cargo, with a Nix flake). It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Build and check with Cargo; the `check-darwin.sh` script exists for macOS-specific verification — run it if you're on a Mac.
- This package is MIT-licensed, unlike the AGPL TypeScript packages.
- If you change the flake outputs, make sure `nix flake check` (or an equivalent build) still passes for the platforms you can test.
