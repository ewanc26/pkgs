#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────────

echo ""
echo "  📦 pkgs monorepo publish"
echo "  ────────────────────────"
echo ""

# Check npm auth
if ! npm whoami &>/dev/null; then
  fail "Not logged into npm. Run: npm login"
fi
log "npm auth: $(npm whoami)"

# Check clean git (warn only)
if [[ -n $(git status --porcelain) ]]; then
  warn "Working tree has uncommitted changes — committing first"
fi

# ── Install ────────────────────────────────────────────────────────────────────

echo ""
log "Installing dependencies…"
pnpm install --no-frozen-lockfile

# ── Commit ─────────────────────────────────────────────────────────────────────

if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "chore: bump versions and extract croft-click-core

- Extract shared core into new @ewanc26/croft-click-core package
- Migrate malachite, jasper, malachite-web to croft-click-core
- Bump all affected packages for publish

@ewanc26/croft-click-core: 0.1.0 (new)
@ewanc26/malachite: 0.13.3 → 0.14.0
@ewanc26/jasper: 0.5.2 → 0.6.0
@ewanc26/opal: 0.1.0 → 0.2.0
@ewanc26/malachite-web: 0.4.9 → 0.5.0
@ewanc26/jasper-web: 0.3.1 → 0.4.0
@ewanc26/opal-web: 0.1.0 → 0.1.1
@ewanc26/bismuth-web: 0.2.1 → 0.2.2

Co-Authored-By: Claude <noreply@anthropic.com>"
  log "Committed"
fi

# Push (ask first)
read -r -p "  Push to origin? [Y/n] " push_ok
if [[ "$push_ok" != "n" && "$push_ok" != "N" ]]; then
  git push
  log "Pushed"
fi

# ── Build & Publish ────────────────────────────────────────────────────────────

# Order matters: deps before consumers
PACKAGES=(
  "@ewanc26/croft-click-core"   # no internal deps — FIRST
  "@ewanc26/malachite"           # depends on croft-click-core
  "@ewanc26/jasper"              # depends on croft-click-core
  "@ewanc26/opal"                # standalone
  "@ewanc26/malachite-web"       # depends on croft-click-core
  "@ewanc26/jasper-web"          # depends on jasper + croft-click-core
  "@ewanc26/opal-web"            # depends on opal
  "@ewanc26/bismuth-web"         # docs only
)

echo ""
echo "  ── Building & Publishing ──"
echo ""

for pkg in "${PACKAGES[@]}"; do
  echo ""
  echo "  ────────────────────────────────────────"
  echo "  ${pkg}"
  echo "  ────────────────────────────────────────"
  echo ""

  # Build
  echo "  Building…"
  pnpm --filter "$pkg" build || fail "Build failed: $pkg"
  log "Built"

  # Publish
  echo "  Publishing…"
  pnpm --filter "$pkg" publish --access public --no-git-checks || fail "Publish failed: $pkg"
  log "Published"
done

# ── Done ───────────────────────────────────────────────────────────────────────

echo ""
echo "  ────────────────────────────────────────"
echo -e "  ${GREEN}All 8 packages published!${NC}"
echo "  ────────────────────────────────────────"
echo ""
