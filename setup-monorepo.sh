#!/usr/bin/env bash
# =============================================================================
# setup-monorepo.sh
# Migrates @ewanc26/* packages into this pnpm monorepo using git subtree,
# preserving full commit history from their source repos.
#
# Packages migrated:
#   malachite/packages/tid            → packages/tid     (@ewanc26/tid)
#   website/packages/atproto          → packages/atproto  (@ewanc26/atproto)
#   website/packages/ui               → packages/ui       (@ewanc26/ui)
#   website/packages/utils            → packages/utils    (@ewanc26/utils)
#   svelte-standard-site/ (whole repo)→ packages/svelte-standard-site
#
# Usage: bash setup-monorepo.sh
# Run from: /Users/ewan/Developer/Git/pkgs
# =============================================================================

set -euo pipefail

PKGS_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_DIR="/Users/ewan/Developer/Git"

MALACHITE_DIR="$GIT_DIR/malachite"
WEBSITE_DIR="$GIT_DIR/website"
SVELTE_STANDARD_SITE_DIR="$GIT_DIR/svelte-standard-site"

cd "$PKGS_DIR"

echo "==> Working in: $PKGS_DIR"
echo ""

# Detect default branch for a repo
default_branch() {
  git -C "$1" symbolic-ref --short HEAD 2>/dev/null || echo "main"
}

# ---------------------------------------------------------------------------
# add_package: extracts a SUBDIRECTORY from a source repo via subtree split,
# then merges it into this monorepo under dest_prefix.
# Use for packages that live in a packages/ subdirectory of another repo.
# ---------------------------------------------------------------------------
add_package() {
  local src_repo="$1"
  local src_prefix="$2"
  local dest_prefix="$3"
  local remote_name="$4"

  echo "------------------------------------------------------------"
  echo "  Adding: $dest_prefix"
  echo "  Source: $src_repo/$src_prefix"
  echo "------------------------------------------------------------"

  local branch="${remote_name}-split"
  local src_branch
  src_branch=$(default_branch "$src_repo")

  echo "  [1/3] Splitting history from $src_repo (branch: $src_branch)..."
  if git -C "$src_repo" show-ref --verify --quiet "refs/heads/$branch"; then
    echo "        (removing stale split branch $branch)"
    git -C "$src_repo" branch -D "$branch"
  fi
  git -C "$src_repo" subtree split \
    --prefix="$src_prefix" \
    --branch "$branch" \
    "$src_branch"

  echo "  [2/3] Fetching split branch into pkgs..."
  if git remote | grep -q "^${remote_name}$"; then
    git remote remove "$remote_name"
  fi
  git remote add "$remote_name" "$src_repo"
  git fetch "$remote_name" "$branch"

  echo "  [3/3] Merging into $dest_prefix..."
  git subtree add \
    --prefix="$dest_prefix" \
    "$remote_name/$branch"

  git remote remove "$remote_name"

  echo "  ✓ Done: $dest_prefix"
  echo ""
}

# ---------------------------------------------------------------------------
# add_whole_repo: adds an ENTIRE source repo as a package, without splitting.
# Use for packages where the repo root IS the package.
# ---------------------------------------------------------------------------
add_whole_repo() {
  local src_repo="$1"
  local dest_prefix="$2"
  local remote_name="$3"

  echo "------------------------------------------------------------"
  echo "  Adding: $dest_prefix"
  echo "  Source: $src_repo (whole repo)"
  echo "------------------------------------------------------------"

  local src_branch
  src_branch=$(default_branch "$src_repo")

  echo "  [1/2] Fetching $src_repo..."
  if git remote | grep -q "^${remote_name}$"; then
    git remote remove "$remote_name"
  fi
  git remote add "$remote_name" "$src_repo"
  git fetch "$remote_name" "$src_branch"

  echo "  [2/2] Merging into $dest_prefix..."
  git subtree add \
    --prefix="$dest_prefix" \
    "$remote_name/$src_branch"

  git remote remove "$remote_name"

  echo "  ✓ Done: $dest_prefix"
  echo ""
}

# ---------------------------------------------------------------------------
# 1. malachite → packages/tid
# ---------------------------------------------------------------------------
add_package \
  "$MALACHITE_DIR" \
  "packages/tid" \
  "packages/tid" \
  "malachite"

# ---------------------------------------------------------------------------
# 2. website → packages/atproto
# ---------------------------------------------------------------------------
add_package \
  "$WEBSITE_DIR" \
  "packages/atproto" \
  "packages/atproto" \
  "website-atproto"

# ---------------------------------------------------------------------------
# 3. website → packages/ui
# ---------------------------------------------------------------------------
add_package \
  "$WEBSITE_DIR" \
  "packages/ui" \
  "packages/ui" \
  "website-ui"

# ---------------------------------------------------------------------------
# 4. website → packages/utils
# ---------------------------------------------------------------------------
add_package \
  "$WEBSITE_DIR" \
  "packages/utils" \
  "packages/utils" \
  "website-utils"

# ---------------------------------------------------------------------------
# 5. svelte-standard-site (whole repo) → packages/svelte-standard-site
# ---------------------------------------------------------------------------
add_whole_repo \
  "$SVELTE_STANDARD_SITE_DIR" \
  "packages/svelte-standard-site" \
  "svelte-standard-site"

echo "============================================================"
echo "  All packages merged! Running pnpm install..."
echo "============================================================"
pnpm install

echo ""
echo "✅  Monorepo setup complete."
echo ""
echo "  packages/tid                   @ewanc26/tid"
echo "  packages/atproto               @ewanc26/atproto"
echo "  packages/ui                    @ewanc26/ui"
echo "  packages/utils                 @ewanc26/utils"
echo "  packages/svelte-standard-site  @ewanc26/svelte-standard-site"
echo ""
echo "  Tip: split branches were left in the source repos."
echo "  To clean them up run:"
echo "    git -C $MALACHITE_DIR branch -D malachite-split"
echo "    git -C $WEBSITE_DIR branch -D website-atproto-split website-ui-split website-utils-split"
