/**
 * Exports a single card from the on-page story recap (StoryRecap.svelte) as
 * a shareable, Instagram-Stories-style portrait image — the recap itself is
 * already built as a sequence of narrative cards for on-page display
 * (story-recap.ts), but nothing exported any of them as an image before
 * this. Shares whichever card the listener is currently looking at.
 */
import { BG, ACCENT, TEXT, MUTED, DIM, FONT_FACE_CSS, esc } from "./theme";

export interface StoryCardData {
  displayName?: string;
  /** e.g. "all-time" or "30-day" */
  label: string;
  heading: string;
  body: string;
  stat?: string;
  statLabel?: string;
  /** 1-based position in the recap sequence, for the "3/11" indicator. */
  cardIndex: number;
  cardTotal: number;
}

const WIDTH = 480;
/** Portrait floor — short cards still read as an Instagram-Stories-shaped image. */
const MIN_HEIGHT = 780;
const PAD = 32;

/** Word-wrap plain text into lines that roughly fit `maxWidth` at `fontSize`. */
function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const charWidth = fontSize * 0.52;
  const maxChars = Math.max(4, Math.floor(maxWidth / charWidth));
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function renderStorySvg(card: StoryCardData): string {
  const headingLines = wrapText(card.heading, 26, WIDTH - PAD * 2);
  const bodyLines = wrapText(card.body, 15, WIDTH - PAD * 2);

  const progressY = 28;
  const brandY = 56;

  const indexY = 84;
  const headingStartY = 120;
  const headingLineHeight = 32;
  const headingEndY = headingStartY + headingLines.length * headingLineHeight;

  const hasStat = Boolean(card.stat);
  const statY = headingEndY + 50;
  const bodyStartY = hasStat ? statY + 50 : headingEndY + 40;
  const bodyLineHeight = 22;
  const bodyEndY = bodyStartY + bodyLines.length * bodyLineHeight;

  const HEIGHT = Math.max(MIN_HEIGHT, Math.ceil(bodyEndY + 80));
  const footerY = HEIGHT - 36;

  // Segmented progress bar across the top, one segment per card in the recap.
  const total = Math.max(1, card.cardTotal);
  const segGap = 4;
  const segWidth = (WIDTH - PAD * 2 - segGap * (total - 1)) / total;
  const progressSvg = Array.from({ length: total }, (_, i) => {
    const x = PAD + i * (segWidth + segGap);
    const filled = i < card.cardIndex;
    return `<rect x="${x}" y="${progressY}" width="${Math.max(2, segWidth)}" height="3" rx="1.5" fill="${filled ? ACCENT : "rgba(255,255,255,0.15)"}" />`;
  }).join("");

  const headingSvg = headingLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${headingStartY + i * headingLineHeight}" font-family="Inter, sans-serif" font-size="26" font-weight="800" fill="${TEXT}">${esc(line)}</text>`,
    )
    .join("");

  const bodySvg = bodyLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${bodyStartY + i * bodyLineHeight}" font-family="Inter, sans-serif" font-size="15" fill="${MUTED}">${esc(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" style="display:block">
	<defs>
		<style>${FONT_FACE_CSS}</style>
		<linearGradient id="storyGlow" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.18" />
			<stop offset="45%" stop-color="${ACCENT}" stop-opacity="0" />
		</linearGradient>
	</defs>

	<rect width="${WIDTH}" height="${HEIGHT}" rx="16" fill="${BG}" />
	<rect width="${WIDTH}" height="${HEIGHT}" rx="16" fill="url(#storyGlow)" />

	<!-- Progress segments -->
	${progressSvg}

	<!-- Branding -->
	<text x="${PAD}" y="${brandY}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${DIM}" letter-spacing="0.1em">TOURMALINE</text>
	<text x="${WIDTH - PAD}" y="${brandY}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${DIM}" text-anchor="end">${esc(card.cardIndex)}/${esc(card.cardTotal)}</text>

	<!-- Recap label -->
	<text x="${PAD}" y="${indexY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${ACCENT}" letter-spacing="0.15em">${esc(card.label.toUpperCase())} RECAP</text>

	<!-- Heading -->
	${headingSvg}

	${hasStat ? `<text x="${PAD}" y="${statY}" font-family="Inter, sans-serif" font-size="44" font-weight="900" fill="${ACCENT}">${esc(card.stat)}</text>${card.statLabel ? `<text x="${PAD + 4}" y="${statY + 18}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" letter-spacing="0.08em">${esc(card.statLabel.toUpperCase())}</text>` : ""}` : ""}

	<!-- Body -->
	${bodySvg}

	<!-- Footer -->
	<text x="${WIDTH / 2}" y="${footerY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" text-anchor="middle">${esc(card.displayName ?? "")} · tourmaline.croft.click</text>
</svg>`;
}
