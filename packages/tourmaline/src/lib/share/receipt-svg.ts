/**
 * Generates a Receiptify-style share card: top tracks laid out like a
 * store receipt, monospace throughout. Same dark-green theme and
 * defensive-escaping approach as personality-svg.ts.
 */
import { BG, SURFACE, BORDER, ACCENT, TEXT, MUTED, DIM, FONT_FACE_CSS, esc } from "./theme";

export interface ReceiptCardData {
  displayName?: string;
  /** Label for the date range this receipt covers, e.g. "All time" or "Last 30 days". */
  rangeLabel?: string;
  tracks: Array<{ name: string; artist: string; count: number }>;
  totalScrobbles?: number;
  totalMinutes?: number;
}

const WIDTH = 380;
const PAD = 24;
const MAX_TRACKS = 12;

/** Dotted leader line between a name and its trailing number, receipt-style. */
function dottedLeader(nameWidth: number, availableWidth: number): string {
  const dotsWidth = Math.max(0, availableWidth - nameWidth);
  const dotCount = Math.floor(dotsWidth / 4);
  return ".".repeat(Math.max(0, dotCount));
}

/** Decorative barcode — purely visual, not a real scannable code. */
function barcodeSvg(y: number): string {
  let x = PAD;
  const bars: string[] = [];
  // Deterministic pseudo-random bar widths so the same data renders the same barcode.
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const endX = WIDTH - PAD;
  while (x < endX) {
    const w = 1 + Math.floor(rand() * 3);
    if (rand() > 0.4) {
      bars.push(`<rect x="${x}" y="${y}" width="${w}" height="32" fill="${TEXT}" />`);
    }
    x += w + 1;
  }
  return bars.join("");
}

export function renderReceiptSvg(card: ReceiptCardData): string {
  const tracks = (Array.isArray(card.tracks) ? card.tracks : [])
    .filter((t) => t && typeof t === "object")
    .slice(0, MAX_TRACKS);

  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // ── Layout ──────────────────────────────────────────────────────────
  let y = 0;
  y += 24; // top padding
  const titleY = y + 16;
  y += 24;
  const subtitleY = y + 10;
  y += 20;

  y += 8;
  const divider1Y = y;
  y += 16;

  const custY = y + 10;
  y += 16;
  const dateY = y + 10;
  y += 16;
  const rangeY = y + 10;
  y += 20;

  const divider2Y = y;
  y += 20;

  const tracksStartY = y;
  y += tracks.length * 20;
  y += 8;

  const divider3Y = y;
  y += 16;

  const totalsStartY = y;
  y += 20; // scrobbles line
  if (card.totalMinutes) y += 20; // minutes line
  y += 12;

  const divider4Y = y;
  y += 24;

  const barcodeY = y;
  y += 40;

  const footerY = y + 8;
  y += 24;

  const HEIGHT = y;

  const trackLines = tracks
    .map((t, i) => {
      const ty = tracksStartY + i * 20;
      const label = `${esc(t.name)} - ${esc(t.artist)}`;
      const countStr = String(t.count ?? 0);
      // Rough character-width estimate at 11px JetBrains Mono for leader sizing.
      const nameCharWidth = 6.2;
      const available = WIDTH - PAD * 2 - countStr.length * 7 - 4;
      const leader = dottedLeader(Math.min(label.length, 44) * nameCharWidth, available);
      const truncated = label.length > 44 ? label.slice(0, 41) + "..." : label;
      return `
<text x="${PAD}" y="${ty}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${TEXT}" xml:space="preserve">${esc(truncated)} ${esc(leader)}</text>
<text x="${WIDTH - PAD}" y="${ty}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${MUTED}" text-anchor="end">${esc(countStr)}</text>`;
    })
    .join("");

  const totalsSvg = [
    `<text x="${PAD}" y="${totalsStartY}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="${ACCENT}">TOTAL SCROBBLES</text>
<text x="${WIDTH - PAD}" y="${totalsStartY}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="${ACCENT}" text-anchor="end">${esc((card.totalScrobbles ?? 0).toLocaleString())}</text>`,
    card.totalMinutes
      ? `<text x="${PAD}" y="${totalsStartY + 20}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${MUTED}">TOTAL TIME</text>
<text x="${WIDTH - PAD}" y="${totalsStartY + 20}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${MUTED}" text-anchor="end">${esc(Math.round(card.totalMinutes / 60).toLocaleString())} hrs</text>`
      : "",
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" style="display:block">
	<defs>
		<style>${FONT_FACE_CSS}</style>
	</defs>

	<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}" />
	<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" fill="none" stroke="${BORDER}" stroke-width="1" />

	<text x="${WIDTH / 2}" y="${titleY}" font-family="'JetBrains Mono', monospace" font-size="18" font-weight="700" fill="${ACCENT}" text-anchor="middle" letter-spacing="0.1em">TOURMALINE</text>
	<text x="${WIDTH / 2}" y="${subtitleY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" text-anchor="middle" letter-spacing="0.15em">LISTENING RECEIPT</text>

	<line x1="${PAD}" y1="${divider1Y}" x2="${WIDTH - PAD}" y2="${divider1Y}" stroke="${BORDER}" stroke-width="1" stroke-dasharray="3,3" />

	<text x="${PAD}" y="${custY}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${MUTED}">CUSTOMER: ${esc(card.displayName ?? "Listener")}</text>
	<text x="${PAD}" y="${dateY}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${MUTED}">DATE: ${esc(date)} ${esc(time)}</text>
	<text x="${PAD}" y="${rangeY}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${MUTED}">RANGE: ${esc(card.rangeLabel ?? "All time")}</text>

	<line x1="${PAD}" y1="${divider2Y}" x2="${WIDTH - PAD}" y2="${divider2Y}" stroke="${BORDER}" stroke-width="1" stroke-dasharray="3,3" />

	${trackLines}

	<line x1="${PAD}" y1="${divider3Y}" x2="${WIDTH - PAD}" y2="${divider3Y}" stroke="${BORDER}" stroke-width="1" stroke-dasharray="3,3" />

	${totalsSvg}

	<line x1="${PAD}" y1="${divider4Y}" x2="${WIDTH - PAD}" y2="${divider4Y}" stroke="${BORDER}" stroke-width="1" stroke-dasharray="3,3" />

	${barcodeSvg(barcodeY)}

	<text x="${WIDTH / 2}" y="${footerY}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${DIM}" text-anchor="middle">tourmaline.croft.click</text>
</svg>`;
}
