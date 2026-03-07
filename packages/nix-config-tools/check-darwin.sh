#!/usr/bin/env bash
# check-darwin.sh — validate all darwin.nix entries before running nrs
# Usage: ./tools/check-darwin.sh
# Exits 0 if everything looks good, 1 if any issues found.

set -euo pipefail

PASS="✅"
FAIL="❌"
WARN="⚠️ "
issues=0

# ── helpers ───────────────────────────────────────────────────────────────────

check_brew() {
  local name=$1
  if brew info "$name" &>/dev/null; then
    echo "  $PASS brew: $name"
  else
    echo "  $FAIL brew: $name  ← not found in Homebrew"
    (( issues++ )) || true
  fi
}

check_cask() {
  local name=$1
  if brew info --cask "$name" &>/dev/null; then
    echo "  $PASS cask: $name"
  else
    echo "  $FAIL cask: $name  ← not found in Homebrew casks"
    (( issues++ )) || true
  fi
}

check_mas() {
  local name=$1 id=$2
  if mas info "$id" &>/dev/null; then
    echo "  $PASS mas:  $name ($id)"
  else
    echo "  $FAIL mas:  $name ($id)  ← ID not found in App Store"
    (( issues++ )) || true
  fi
}

check_nixpkg() {
  local attr=$1
  # Evaluate against nixpkgs-darwin for aarch64 (matches macmini flake input)
  if nix eval --impure \
       --expr "let p = import <nixpkgs> { system = \"aarch64-darwin\"; config.allowUnfree = true; }; in p.${attr}.name" \
       &>/dev/null; then
    echo "  $PASS nixpkg: $attr"
  else
    echo "  $FAIL nixpkg: $attr  ← not available / wrong attr / unsupported on aarch64-darwin"
    (( issues++ )) || true
  fi
}

# ── brews ─────────────────────────────────────────────────────────────────────

echo ""
echo "── Homebrew formulas ────────────────────────────────────────────────────"
for name in \
  libmediainfo media-info libzen \
  aribb24 dav1d rav1e svt-av1 x264 x265 xvid webp aom jpeg-xl highway \
  flac lame opus vorbis-tools libsndfile libsamplerate rubberband speex theora mpg123 \
  little-cms2 leptonica \
  rtmpdump srt librist libmms \
  lzo snappy xxhash yyjson \
  freetds unixodbc \
  summarize goat mas
do
  check_brew "$name"
done

# ── casks ─────────────────────────────────────────────────────────────────────

echo ""
echo "── Homebrew casks ───────────────────────────────────────────────────────"
for name in \
  element \
  github claude \
  firefox \
  obs handbrake-app \
  steam epic-games prismlauncher utm \
  cloudflare-warp tailscale-app parsec onyx mos \
  microsoft-excel microsoft-powerpoint microsoft-teams microsoft-word libreoffice \
  logitune logitech-options \
  netnewswire altserver
do
  check_cask "$name"
done

# ── MAS apps ──────────────────────────────────────────────────────────────────

echo ""
echo "── Mac App Store apps ───────────────────────────────────────────────────"
check_mas "Amphetamine"    937984704
# Mini Motorways is Apple Arcade — no MAS ID, managed by Arcade subscription
check_mas "OneDrive"       823766827
check_mas "OP Auto Clicker" 6754914118
check_mas "Steam Link"     1246969117
check_mas "TestFlight"     899247664
check_mas "The Unarchiver" 425424353
check_mas "WhatsApp"       310633997
check_mas "Zone Bar"       6755328989

# ── nixpkgs packages (aarch64-darwin) ─────────────────────────────────────────

echo ""
echo "── nixpkgs packages (aarch64-darwin) ────────────────────────────────────"
echo "   (uses <nixpkgs> from your NIX_PATH — run 'nix flake update' first if stale)"
for attr in \
  coreutils parallel stow netcat \
  openssl readline ncurses pcre pcre2 libffi \
  discord signal-desktop-bin obsidian vscode spotify transmission_4
do
  check_nixpkg "$attr"
done

# ── summary ───────────────────────────────────────────────────────────────────

echo ""
echo "─────────────────────────────────────────────────────────────────────────"
if [[ $issues -eq 0 ]]; then
  echo "$PASS All checks passed — safe to run nrs"
else
  echo "$FAIL $issues issue(s) found — fix darwin.nix before running nrs"
  exit 1
fi
