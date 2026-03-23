#!/usr/bin/env bash
# release.sh — build, version-bump, publish one or more packages, then optionally
# update downstream consumers.
#
# Usage:
#   ./release.sh [options] <package-name> [package-name ...]
#
# Options:
#   -b, --bump <patch|minor|major>   Version bump type (default: patch)
#   -d, --downstream <dir> [dir...]  Paths to run `pnpm install` in after publish
#   -w, --wait <seconds>             Registry propagation wait (default: 10)
#   -n, --dry-run                    Print what would happen without doing it
#   -h, --help                       Show this help
#
# Package names can be short ("ui", "atproto") or scoped ("@ewanc26/ui").
# They are matched against the `name` field in each packages/*/package.json.
#
# Examples:
#   ./release.sh ui
#   ./release.sh --bump minor ui atproto
#   ./release.sh --bump patch ui --downstream ../website

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGES_DIR="$SCRIPT_DIR/packages"

# ── Defaults ──────────────────────────────────────────────────────────────────
BUMP="patch"
DOWNSTREAM=()
WAIT=10
DRY_RUN=false
TARGETS=()

# ── Colours ───────────────────────────────────────────────────────────────────
bold="\033[1m"
green="\033[32m"
yellow="\033[33m"
red="\033[31m"
reset="\033[0m"

info()    { echo -e "${bold}  →${reset} $*"; }
success() { echo -e "${green}  ✓${reset} $*"; }
warn()    { echo -e "${yellow}  ⚠${reset} $*"; }
die()     { echo -e "${red}  ✗${reset} $*" >&2; exit 1; }
dryrun()  { echo -e "${yellow}  [dry-run]${reset} $*"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--bump)
      BUMP="$2"; shift 2
      [[ "$BUMP" =~ ^(patch|minor|major)$ ]] || die "Invalid bump type: $BUMP"
      ;;
    -d|--downstream)
      shift
      while [[ $# -gt 0 && ! "$1" =~ ^- ]]; do
        DOWNSTREAM+=("$1"); shift
      done
      ;;
    -w|--wait)
      WAIT="$2"; shift 2
      ;;
    -n|--dry-run)
      DRY_RUN=true; shift
      ;;
    -h|--help)
      sed -n '3,20p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      TARGETS+=("$1"); shift
      ;;
  esac
done

[[ ${#TARGETS[@]} -eq 0 ]] && die "No packages specified. Run with --help for usage."

# ── Resolve package directories ───────────────────────────────────────────────
resolve_package() {
  local target="$1"
  # Strip leading @scope/ if present, try both directory name and package.json name
  for pkg_dir in "$PACKAGES_DIR"/*/; do
    [[ -f "$pkg_dir/package.json" ]] || continue
    local name dir_name
    name="$(node -p "require('$pkg_dir/package.json').name" 2>/dev/null || true)"
    dir_name="$(basename "$pkg_dir")"
    if [[ "$name" == "$target" || "$dir_name" == "$target" || "$name" == "@ewanc26/$target" ]]; then
      echo "$pkg_dir"
      return
    fi
  done
  die "Could not find package matching: $target"
}

# ── Main loop ─────────────────────────────────────────────────────────────────
RELEASED=()

for target in "${TARGETS[@]}"; do
  pkg_dir="$(resolve_package "$target")"
  pkg_name="$(node -p "require('$pkg_dir/package.json').name")"
  current_ver="$(node -p "require('$pkg_dir/package.json').version")"

  echo ""
  info "Package:  ${bold}$pkg_name${reset} (${pkg_dir##"$SCRIPT_DIR/"})"
  info "Current:  $current_ver"
  info "Bump:     $BUMP"

  if $DRY_RUN; then
    dryrun "Would run: cd $pkg_dir && npm version $BUMP --no-git-tag-version"
    dryrun "Would run: pnpm --filter $pkg_name build"
    dryrun "Would run: pnpm --filter $pkg_name publish --no-git-checks"
    RELEASED+=("$pkg_name")
    continue
  fi

  # Bump version
  new_ver="$(cd "$pkg_dir" && npm version "$BUMP" --no-git-tag-version | tr -d 'v')"
  success "Bumped to $new_ver"

  # Build
  info "Building..."
  pnpm --filter "$pkg_name" build
  success "Built"

  # Publish
  info "Publishing..."
  pnpm --filter "$pkg_name" publish --no-git-checks
  success "Published $pkg_name@$new_ver"

  RELEASED+=("$pkg_name@$new_ver")
done

# ── Downstream updates ────────────────────────────────────────────────────────
if [[ ${#DOWNSTREAM[@]} -gt 0 ]]; then
  if $DRY_RUN; then
    dryrun "Would wait ${WAIT}s for registry propagation"
    for dir in "${DOWNSTREAM[@]}"; do
      dryrun "Would run: cd $dir && pnpm install --registry https://registry.npmjs.org"
    done
  else
    echo ""
    for dir in "${DOWNSTREAM[@]}"; do
      abs_dir="$(cd "$SCRIPT_DIR" && cd "$dir" && pwd)"
      pkg_name_there="$(node -p "require('$abs_dir/package.json').name" 2>/dev/null || echo "$dir")"
      info "Updating downstream: ${bold}$pkg_name_there${reset}"

      # For each released package, update the constraint in package.json if pinned
      for released in "${RELEASED[@]}"; do
        pkg="${released%@*}"   # e.g. @ewanc26/ui
        ver="${released##*@}"  # e.g. 0.3.4
        escaped_pkg="$(echo "$pkg" | sed 's/[\/&]/\\&/g')"
        sed -i '' "s/\"$escaped_pkg\": \"\^[0-9]*\.[0-9]*\.[0-9]*\"/\"$escaped_pkg\": \"^$ver\"/" \
          "$abs_dir/package.json" 2>/dev/null || true
      done

      # Retry install until the registry has propagated the new versions
      _attempt=0
      _max=10
      while true; do
        _attempt=$((_attempt + 1))
        info "Install attempt $_attempt/$_max..."
        if (cd "$abs_dir" && pnpm install --registry https://registry.npmjs.org 2>&1); then
          success "Updated $pkg_name_there"
          break
        fi
        if [[ $_attempt -ge $_max ]]; then
          die "Failed to install after $_max attempts. Registry may still be propagating — try again in a moment."
        fi
        warn "Not yet available, waiting ${WAIT}s..."
        sleep "$WAIT"
      done
    done
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${bold}Released:${reset}"
for r in "${RELEASED[@]}"; do
  echo -e "  ${green}✓${reset} $r"
done
echo ""
