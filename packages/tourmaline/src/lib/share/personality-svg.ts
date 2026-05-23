/**
 * Generates an SVG string for the personality card share image.
 * Matches the tourmaline dark-green theme.
 *
 * Fonts are embedded as base64 woff2 so the canvas-to-PNG pipeline
 * renders them correctly (external @import doesn't work in Image → canvas).
 */

import type { PersonalityTrait } from "$lib/analysis/personality";
import { INTER_WOFF2, JETBRAINS_MONO_WOFF2 } from "./fonts/embedded-fonts";

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

const BG = "#0a0f0a";
const SURFACE = "#0f170f";
const BORDER = "#1a2b1a";
const ACCENT = "#4ade80";
const TEXT = "#e5e7eb";
const MUTED = "#9ca3af";
const DIM = "#6b7280";

const GENRE_COLORS: Record<string, string> = {
  Metal: "#ef4444",
  Rock: "#f97316",
  Pop: "#eab308",
  Electronic: "#22d3ee",
  "Hip Hop": "#a855f7",
  Jazz: "#f59e0b",
  Classical: "#d4d4d8",
  Folk: "#a3e635",
  Country: "#fb923c",
  "R&B": "#ec4899",
  Blues: "#3b82f6",
  Reggae: "#10b981",
  Latin: "#f43f5e",
  World: "#14b8a6",
  Soundtrack: "#8b5cf6",
  "New Age": "#67e8f9",
  Punk: "#dc2626",
  "Singer-Songwriter": "#fbbf24",
};

const MOOD_COLORS: Record<string, string> = {
  Energetic: "#f97316",
  Melancholic: "#6366f1",
  Chill: "#22d3ee",
  Happy: "#facc15",
  Aggressive: "#ef4444",
  Atmospheric: "#8b5cf6",
  Nostalgic: "#f59e0b",
  Dark: "#6b7280",
};

const FONT_FACE_CSS = `
@font-face {
	font-family: 'Inter';
	src: url(data:font/woff2;base64,${INTER_WOFF2}) format('woff2');
	font-weight: 100 900;
	font-style: normal;
}
@font-face {
	font-family: 'JetBrains Mono';
	src: url(data:font/woff2;base64,${JETBRAINS_MONO_WOFF2}) format('woff2');
	font-weight: 400;
	font-style: normal;
}
`.trim();

export function renderPersonalitySvg(card: PersonalityCardData): string {
  const genres = (card.genres ?? []).slice(0, 5);
  const maxGenreWeight = genres[0]?.weight ?? 1;

  const moods = Object.entries(card.mood ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .filter(([, v]) => v > 0);

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
  for (let i = 0; i < card.traits.length; i++) {
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
      const barWidth = Math.max(4, (g.weight / maxGenreWeight) * 420);
      const color = GENRE_COLORS[g.name] ?? ACCENT;
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
      const color = MOOD_COLORS[mood] ?? ACCENT;
      return `
<g transform="translate(${x}, ${moodY})">
	<rect width="${pillWidth}" height="22" rx="11" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" />
	<circle cx="14" cy="11" r="4" fill="${color}" />
	<text x="24" y="15" font-family="Inter, sans-serif" font-size="11" fill="${MUTED}">${esc(mood)}</text>
	<text x="${pillWidth - 10}" y="15" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" text-anchor="end">${score}</text>
</g>`;
    })
    .join("");

  // ── Build trait cards ──────────────────────────────────────────────────
  const traitSvg = card.traits
    .map((t, i) => {
      const ty = traitSectionLabelY + 8 + i * 46;
      return `
<g transform="translate(${PAD}, ${ty})">
	<rect width="${WIDTH - PAD * 2}" height="38" rx="6" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" />
	<text x="12" y="14" font-family="'JetBrains Mono', monospace" font-size="9" fill="${DIM}" letter-spacing="0.08em">${esc(t.label.toUpperCase())}</text>
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
	<text x="${PAD + 8}" y="${statY + 2}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}">DIV ${card.diversityScore ?? "-"}</text>
	<rect x="${PAD + 112}" y="${statY - 10}" width="100" height="20" rx="4" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" />
	<text x="${PAD + 120}" y="${statY + 2}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}">OBS ${card.obscurityIndex ?? "-"}</text>

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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
