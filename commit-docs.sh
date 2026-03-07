#!/usr/bin/env bash
# =============================================================================
# commit-docs.sh
# Commits and pushes documentation/scaffold updates across all affected repos,
# pushing to every configured remote.
#
# Repos touched:
#   malachite            — packages/tid/README.md, CONTRIBUTING.md
#                          remotes: origin (GitHub), tangled
#   website              — packages/atproto/README.md, packages/ui/README.md,
#                          packages/utils/README.md
#                          remotes: origin (GitHub), tangled
#   svelte-standard-site — package.json, README.md
#                          remotes: origin (GitHub)
#   docsite              — src/content/documentation/{tid,atproto,ui,utils,
#                          pkgs,svelte-standard-site}.md
#                          remotes: origin (GitHub)
#   pkgs                 — README.md, package.json, pnpm-workspace.yaml,
#                          .gitignore, setup-monorepo.sh, commit-docs.sh
#                          remotes: origin (GitHub)
#
# Usage: bash commit-docs.sh
# Run from anywhere — paths are absolute.
# =============================================================================

set -euo pipefail

GIT_DIR="/Users/ewan/Developer/Git"

MALACHITE="$GIT_DIR/malachite"
WEBSITE="$GIT_DIR/website"
SVELTE_STANDARD_SITE="$GIT_DIR/svelte-standard-site"
DOCSITE="$GIT_DIR/docsite"
PKGS="$GIT_DIR/pkgs"

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }

push_all_remotes() {
  local branch
  branch=$(git symbolic-ref --short HEAD)
  local remotes
  remotes=$(git remote)

  if [[ -z "$remotes" ]]; then
    yellow "  no remotes configured — skipping push"
    return
  fi

  while IFS= read -r remote; do
    echo "  pushing to $remote..."
    if git push "$remote" "$branch"; then
      green "  ✓ $remote"
    else
      red "  ✗ $remote (push failed — check remote access)"
    fi
  done <<< "$remotes"
}

commit_and_push() {
  local repo="$1"
  local message="$2"
  shift 2
  local files=("$@")

  echo ""
  yellow "── $(basename "$repo") ──────────────────────────────────────────────"
  cd "$repo"

  for f in "${files[@]}"; do
    if [[ -f "$f" ]]; then
      git add "$f"
    else
      echo "  (skipping missing file: $f)"
    fi
  done

  if git diff --cached --quiet; then
    echo "  nothing to commit — already up to date"
    return
  fi

  git commit -m "$message"
  push_all_remotes
}

# -----------------------------------------------------------------------------
# malachite — origin + tangled
# -----------------------------------------------------------------------------
commit_and_push "$MALACHITE" \
  "docs: point packages/tid and CONTRIBUTING to pkgs monorepo" \
  "packages/tid/README.md" \
  "CONTRIBUTING.md"

# -----------------------------------------------------------------------------
# website — origin + tangled
# -----------------------------------------------------------------------------
commit_and_push "$WEBSITE" \
  "docs: point packages to pkgs monorepo as canonical source" \
  "packages/atproto/README.md" \
  "packages/ui/README.md" \
  "packages/utils/README.md"

# -----------------------------------------------------------------------------
# svelte-standard-site — origin only
# -----------------------------------------------------------------------------
commit_and_push "$SVELTE_STANDARD_SITE" \
  "chore: rename to @ewanc26/svelte-standard-site; point to pkgs as canonical source" \
  "package.json" \
  "README.md"

# -----------------------------------------------------------------------------
# docsite — origin only
# -----------------------------------------------------------------------------
commit_and_push "$DOCSITE" \
  "docs: update package docs to reference pkgs monorepo; add pkgs.md and svelte-standard-site update" \
  "src/content/documentation/tid.md" \
  "src/content/documentation/atproto.md" \
  "src/content/documentation/ui.md" \
  "src/content/documentation/utils.md" \
  "src/content/documentation/pkgs.md" \
  "src/content/documentation/svelte-standard-site.md"

# -----------------------------------------------------------------------------
# pkgs — origin only
# -----------------------------------------------------------------------------
commit_and_push "$PKGS" \
  "chore: add svelte-standard-site to monorepo; update scaffold and scripts" \
  "README.md" \
  "package.json" \
  "pnpm-workspace.yaml" \
  ".gitignore" \
  "setup-monorepo.sh" \
  "commit-docs.sh"

echo ""
green "============================================================"
green "  All repos committed and pushed to all remotes."
green "============================================================"
