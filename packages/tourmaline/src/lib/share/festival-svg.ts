/**
 * Generates an Instafest-style festival lineup poster from a listener's top
 * artists — headliners in large type at the top, smaller acts in rows below,
 * font size falling off by rank tier. Same theme/escaping approach as the
 * other share cards.
 */
import { BG, BORDER, ACCENT, TEXT, DIM, FONT_FACE_CSS, esc } from "./theme";

export interface FestivalCardData {
  displayName?: string;
  rangeLabel?: string;
  artists: Array<{ name: string; count: number }>;
}

const WIDTH = 600;
const PAD = 32;

/** Rank tiers: [count of artists in this tier, font size, letter spacing]. */
const TIERS: Array<{ count: number; size: number; weight: number; gap: number }> = [
  { count: 3, size: 30, weight: 800, gap: 8 },
  { count: 5, size: 19, weight: 700, gap: 6 },
  { count: 6, size: 14, weight: 600, gap: 5 },
  { count: 8, size: 11, weight: 500, gap: 4 },
];

/** Wrap a list of names into lines that roughly fit `maxWidth`, using a crude per-character estimate. */
function wrapNames(names: string[], fontSize: number, maxWidth: number, separator = "   •   "): string[] {
  const charWidth = fontSize * 0.58;
  const sepWidth = separator.length * charWidth;
  const lines: string[] = [];
  let current: string[] = [];
  let currentWidth = 0;

  for (const name of names) {
    const nameWidth = name.length * charWidth;
    const addedWidth = current.length > 0 ? sepWidth + nameWidth : nameWidth;
    if (currentWidth + addedWidth > maxWidth && current.length > 0) {
      lines.push(current.join(separator));
      current = [name];
      currentWidth = nameWidth;
    } else {
      current.push(name);
      currentWidth += addedWidth;
    }
  }
  if (current.length > 0) lines.push(current.join(separator));
  return lines;
}

export function renderFestivalSvg(card: FestivalCardData): string {
  const artists = (Array.isArray(card.artists) ? card.artists : [])
    .filter((a) => a && typeof a === "object" && typeof a.name === "string")
    .slice(0, TIERS.reduce((sum, t) => sum + t.count, 0));

  // ── Layout ──────────────────────────────────────────────────────────
  let y = 0;
  y += 40; // top padding
  const titleY = y + 28;
  y += 40;
  const subtitleY = y + 12;
  y += 24;

  y += 12;
  const dividerTopY = y;
  y += 28;

  let cursor = 0;
  const tierRows: Array<{ lines: string[]; size: number; weight: number; startY: number }> = [];
  for (const tier of TIERS) {
    const names = artists.slice(cursor, cursor + tier.count).map((a) => a.name);
    cursor += tier.count;
    if (names.length === 0) continue;
    const lines = wrapNames(names, tier.size, WIDTH - PAD * 2);
    const startY = y;
    tierRows.push({ lines, size: tier.size, weight: tier.weight, startY });
    for (const _line of lines) {
      y += tier.size * 1.5;
    }
    y += tier.gap * 2;
  }

  y += 12;
  const dividerBottomY = y;
  y += 28;

  const footerY = y + 10;
  y += 30;

  const HEIGHT = Math.ceil(y);

  const tiersSvg = tierRows
    .map((row) =>
      row.lines
        .map((line, i) => {
          const ty = row.startY + i * row.size * 1.5 + row.size;
          return `<text x="${WIDTH / 2}" y="${ty}" font-family="Inter, sans-serif" font-size="${row.size}" font-weight="${row.weight}" fill="${TEXT}" text-anchor="middle" letter-spacing="0.02em">${esc(line)}</text>`;
        })
        .join(""),
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" style="display:block">
	<defs>
		<style>${FONT_FACE_CSS}</style>
		<linearGradient id="festivalGlow" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.12" />
			<stop offset="100%" stop-color="${ACCENT}" stop-opacity="0" />
		</linearGradient>
	</defs>

	<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}" />
	<rect width="${WIDTH}" height="${Math.min(HEIGHT, 260)}" fill="url(#festivalGlow)" />
	<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="12" fill="none" stroke="${BORDER}" stroke-width="1" />

	<text x="${WIDTH / 2}" y="${titleY}" font-family="Inter, sans-serif" font-size="34" font-weight="900" fill="${ACCENT}" text-anchor="middle" letter-spacing="0.06em">TOURMALINE FEST</text>
	<text x="${WIDTH / 2}" y="${subtitleY}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${DIM}" text-anchor="middle" letter-spacing="0.15em">${esc((card.rangeLabel ?? "ALL TIME").toUpperCase())} · CURATED BY ${esc((card.displayName ?? "A LISTENER").toUpperCase())}</text>

	<line x1="${WIDTH / 2 - 60}" y1="${dividerTopY}" x2="${WIDTH / 2 + 60}" y2="${dividerTopY}" stroke="${ACCENT}" stroke-width="2" />

	${tiersSvg}

	<line x1="${PAD}" y1="${dividerBottomY}" x2="${WIDTH - PAD}" y2="${dividerBottomY}" stroke="${BORDER}" stroke-width="1" />
	<text x="${WIDTH / 2}" y="${footerY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" text-anchor="middle" letter-spacing="0.1em">TOURMALINE.CROFT.CLICK</text>
</svg>`;
}
