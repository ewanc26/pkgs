/**
 * Generates an SVG string for the personality card share image.
 * Matches the tourmaline dark-green theme.
 *
 * Fonts are embedded as base64 woff2 so the canvas-to-PNG pipeline
 * renders them correctly (external @import doesn't work in Image → canvas).
 */

import type { PersonalityTrait } from "$lib/analysis/personality";
import {
  BG,
  SURFACE,
  BORDER,
  ACCENT,
  TEXT,
  MUTED,
  DIM,
  GENRE_COLORS,
  MOOD_COLORS,
  FONT_FACE_CSS,
  colourFor,
  esc,
} from "./theme";

export interface PersonalityCardData {
  archetype: string;
  archetypeBlurb: string;
  traits: PersonalityTrait[];
  genres?: Array<{ name: string; weight: number }>;
  mood?: Record<string, number>;
  diversityScore?: number;
  obscurityIndex?: number;
  displayName?: string;
  totalScrobbles?: number;
}

export function renderPersonalitySvg(card: PersonalityCardData): string {
  // `card` is rehydrated from sessionStorage, so every collection on it has to
  // be re-checked before it is iterated.
  const genres = (Array.isArray(card.genres) ? card.genres : [])
    .filter((g) => g && typeof g === "object")
    .slice(0, 5);
  const maxGenreWeight = Number(genres[0]?.weight) || 1;

  const mood =
    card.mood && typeof card.mood === "object" && !Array.isArray(card.mood)
      ? card.mood
      : {};
  const moods = Object.entries(mood)
    .filter(([, v]) => typeof v === "number" && isFinite(v) && v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const traits = Array.isArray(card.traits)
    ? card.traits.filter((t) => t && typeof t === "object")
    : [];

  // ── Layout calculations ──────────────────────────────────────────────
  let y = 0;
  const PAD = 32;
  const WIDTH = 600;

  // Top accent line
  y += 3;

  // Display name
  y += 10; // gap
  const nameY = y + 16;
  y += 24;

  // Archetype
  y += 8;
  const archLabelY = y + 12;
  y += 18;
  const archNameY = y + 32;
  y += 38;

  // Blurb
  const blurbY = y + 14;
  y += 22;

  // Stat badges
  y += 8;
  const statY = y + 12;
  y += 22;

  // Divider
  y += 12;
  const divider1Y = y;
  y += 16;

  // Genre bars section
  const genreSectionLabelY = y + 12;
  y += 20;
  const genreStartY = y;
  for (let i = 0; i < genres.length; i++) {
    y += 18; // bar height + gap
  }
  y += 4;

  // Mood indicators section
  const moodSectionLabelY = y + 12;
  y += 20;
  const moodY = y + 10;
  y += 24;

  // Divider
  y += 8;
  const divider2Y = y;
  y += 16;

  // Trait section label
  const traitSectionLabelY = y + 12;
  y += 20;

  // Trait cards
  for (
    let i = 0;
    i < (Array.isArray(card.traits) ? card.traits.length : 0);
    i++
  ) {
    y += 46; // card height + gap
  }

  // Footer
  y += 12;
  const footerLineY = y;
  y += 16;
  const footerY = y + 12;
  y += 16;

  const HEIGHT = y;

  // ── Build genre bars ──────────────────────────────────────────────────
  const genreSvg = genres
    .map((g, i) => {
      const barY = genreStartY + i * 18;
      const weight = Number(g.weight) || 0;
      const barWidth = Math.min(
        420,
        Math.max(4, (weight / maxGenreWeight) * 420),
      );
      const color = colourFor(GENRE_COLORS, g.name);
      return `
<g transform="translate(${PAD}, ${barY})">
	<text x="0" y="12" font-family="Inter, sans-serif" font-size="11" fill="${MUTED}">${esc(g.name)}</text>
	<rect x="90" y="2" width="420" height="8" rx="4" fill="${SURFACE}" />
	<rect x="90" y="2" width="${barWidth}" height="8" rx="4" fill="${color}" />
</g>`;
    })
    .join("");

  // ── Build mood pills ──────────────────────────────────────────────────
  const pillWidth = 110;
  const moodSvg = moods
    .map(([mood, score], i) => {
      const x = PAD + i * (pillWidth + 8);
      const color = colourFor(MOOD_COLORS, mood);
      return `
<g transform="translate(${x}, ${moodY})">
	<rect width="${pillWidth}" height="22" rx="11" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" />
	<circle cx="14" cy="11" r="4" fill="${color}" />
	<text x="24" y="15" font-family="Inter, sans-serif" font-size="11" fill="${MUTED}">${esc(mood)}</text>
	<text x="${pillWidth - 10}" y="15" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" text-anchor="end">${esc(score)}</text>
</g>`;
    })
    .join("");

  // ── Build trait cards ──────────────────────────────────────────────────
  const traitSvg = traits
    .map((t, i) => {
      const ty = traitSectionLabelY + 8 + i * 46;
      return `
<g transform="translate(${PAD}, ${ty})">
	<rect width="${WIDTH - PAD * 2}" height="38" rx="6" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" />
	<text x="12" y="14" font-family="'JetBrains Mono', monospace" font-size="9" fill="${DIM}" letter-spacing="0.08em">${esc(String(t.label ?? "").toUpperCase())}</text>
	<text x="12" y="30" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="${TEXT}">${esc(t.value)}</text>
	<text x="${WIDTH - PAD * 2 - 12}" y="24" font-family="Inter, sans-serif" font-size="9" fill="${MUTED}" text-anchor="end">${esc(t.detail)}</text>
</g>`;
    })
    .join("");

  // ── Assemble SVG ──────────────────────────────────────────────────────
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" style="display:block">
	<defs>
		<style>${FONT_FACE_CSS}</style>
	</defs>

	<!-- Background -->
	<rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="${BG}" />

	<!-- Top accent line -->
	<rect x="0" y="0" width="${WIDTH}" height="3" rx="1.5" fill="${ACCENT}" />

	<!-- Display name -->
	<text x="${PAD}" y="${nameY}" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="${MUTED}">${esc(card.displayName ?? "Listener")}</text>

	<!-- Archetype label -->
	<text x="${PAD}" y="${archLabelY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" letter-spacing="0.08em">LISTENER ARCHETYPE</text>

	<!-- Archetype name -->
	<text x="${PAD}" y="${archNameY}" font-family="Inter, sans-serif" font-size="32" font-weight="700" fill="${ACCENT}">${esc(card.archetype)}</text>

	<!-- Blurb -->
	<text x="${PAD}" y="${blurbY}" font-family="Inter, sans-serif" font-size="13" fill="${MUTED}">${esc(card.archetypeBlurb)}</text>

	<!-- Stat badges -->
	<rect x="${PAD}" y="${statY - 10}" width="100" height="20" rx="4" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" />
	<text x="${PAD + 8}" y="${statY + 2}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}">DIV ${esc(card.diversityScore ?? "-")}</text>
	<rect x="${PAD + 112}" y="${statY - 10}" width="100" height="20" rx="4" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" />
	<text x="${PAD + 120}" y="${statY + 2}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}">OBS ${esc(card.obscurityIndex ?? "-")}</text>

	<!-- Divider 1 -->
	<line x1="${PAD}" y1="${divider1Y}" x2="${WIDTH - PAD}" y2="${divider1Y}" stroke="${BORDER}" stroke-width="1" />

	<!-- Genre section label -->
	<text x="${PAD}" y="${genreSectionLabelY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" letter-spacing="0.08em">GENRE PROFILE</text>

	<!-- Genre bars -->
	${genreSvg}

	<!-- Mood section label -->
	<text x="${PAD}" y="${moodSectionLabelY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" letter-spacing="0.08em">MOOD PROFILE</text>

	<!-- Mood pills -->
	${moodSvg}

	<!-- Divider 2 -->
	<line x1="${PAD}" y1="${divider2Y}" x2="${WIDTH - PAD}" y2="${divider2Y}" stroke="${BORDER}" stroke-width="1" />

	<!-- Trait section label -->
	<text x="${PAD}" y="${traitSectionLabelY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" letter-spacing="0.08em">PERSONALITY PROFILE</text>

	<!-- Trait cards -->
	${traitSvg}

	<!-- Footer -->
	<line x1="${PAD}" y1="${footerLineY}" x2="${WIDTH - PAD}" y2="${footerLineY}" stroke="${BORDER}" stroke-width="1" />
	<text x="${PAD}" y="${footerY}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${DIM}">tourmaline</text>
	<text x="${WIDTH - PAD}" y="${footerY}" font-family="Inter, sans-serif" font-size="11" fill="${DIM}" text-anchor="end">croft.click</text>
</svg>`;
}
