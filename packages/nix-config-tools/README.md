# Nix Config Tools

Four Rust utilities for managing the nix config. Run via the flake — no
`cargo build` required:

```bash
nix run github:ewanc26/pkgs#health-check
nix run github:ewanc26/pkgs#flake-bump
nix run github:ewanc26/pkgs#gen-diff
nix run github:ewanc26/pkgs#server-config
```

Or via the shell aliases set up by `home/programs/zsh.nix`:

```bash
health-check    # pre-rebuild preflight
flake-bump      # inspect / update flake inputs
gen-diff        # diff package changes between generations
```

For local dev (working tree, uncommitted changes):

```bash
nix run ./packages/nix-config-tools#flake-bump
```

---

## `health-check`

Pre-rebuild preflight. Run before `nrs` to catch problems early.

```bash
health-check
```

Checks:
- Nix daemon is responding
- `flake.lock` is present and valid JSON
- Flake evaluates without errors
- Git working tree is clean
- Age key exists at `~/.config/age/keys.txt`
- SSH keys present in `modules/ssh-keys.nix`
- Disk space on `/nix/store`
- Homebrew installed (macOS only)

Exits 0 when all hard checks pass (warnings are non-fatal).

---

## `flake-bump`

Shows how stale each flake input is and bumps them selectively.

```bash
flake-bump                     # show staleness table
flake-bump --update nixpkgs    # bump one input and commit flake.lock
flake-bump --update-all        # bump everything and commit flake.lock
```

---

## `gen-diff`

Shows what packages changed between NixOS/nix-darwin generations.

```bash
gen-diff                       # diff last two generations
gen-diff --list                # list all generations with dates
gen-diff --from 42 --to 43     # diff specific generation numbers
```

Wraps `nix store diff-closures` with a friendlier interface and generation listing.

---

## `server-config`

Interactive server configurator: service toggles, storage device, Cockpit,
Forgejo, Matrix, PDS, Cloudflare settings.

```bash
server-config          # interactive configuration
server-config --show   # read-only summary
```

---

## Retired tools

The following tools were removed. Their source files remain in `src/bin/` for
reference but are no longer compiled.

| Tool | Reason removed |
|---|---|
| `darwin-export` | macOS settings are now fully declarative in `settings/darwin/default.nix` — nothing to export |
| `gnome-export` | GNOME/dconf settings are now fully declarative in `settings/gnome/dconf-settings.nix` — nothing to export |
| `secrets-setup` | Was a stub that only checked if `~/.config/age/keys.txt` existed; `health-check` covers this |
| `categorize-apps` | `nix search` / `brew info --cask` lookups produce false positives; `darwin.nix` is hand-maintained |
| `generate-app-config` | Same reasons as `categorize-apps` |
| `sync-apps` | Same reasons, plus it auto-mutated config files without review |

---

## Development

### Adding a new tool

1. Create `src/bin/your-tool.rs`
2. Add to `Cargo.toml`:
   ```toml
   [[bin]]
   name = "your-tool"
   path = "src/bin/your-tool.rs"
   ```
3. Expose in the root `flake.nix` under `apps`
4. Add a shell alias in `home/programs/zsh.nix` if used regularly

### Common utilities (`lib.rs`)

```rust
use tools_common::*;

let root      = git_root();       // path to ~/.config/nix-config
let timestamp = get_timestamp();  // "2026-02-14 20:00:00"
let host      = get_hostname();   // "macmini"

// Commit a file and push
git_sync("flake.lock", "flake");
```
