/**
 * Shared palette, fonts, and escaping helper for every share-card SVG
 * renderer, extracted from personality-svg.ts so receipt/festival/story
 * cards match the same dark-green theme instead of redefining it three
 * more times.
 */
import { INTER_WOFF2, JETBRAINS_MONO_WOFF2 } from "./fonts/embedded-fonts";

export const BG = "#0a0f0a";
export const SURFACE = "#0f170f";
export const BORDER = "#1a2b1a";
export const ACCENT = "#4ade80";
export const TEXT = "#e5e7eb";
export const MUTED = "#9ca3af";
export const DIM = "#6b7280";

export const GENRE_COLORS: Record<string, string> = {
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

export const MOOD_COLORS: Record<string, string> = {
  Energetic: "#f97316",
  Melancholic: "#6366f1",
  Chill: "#22d3ee",
  Happy: "#facc15",
  Aggressive: "#ef4444",
  Atmospheric: "#8b5cf6",
  Nostalgic: "#f59e0b",
  Dark: "#6b7280",
};

export const FONT_FACE_CSS = `
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

/**
 * Look a colour up by an untrusted key.
 *
 * Plain bracket access would walk the prototype chain, so a genre or mood
 * literally named `constructor` would yield a function that then lands
 * unescaped inside a `fill="…"` attribute of the `{@html}`-injected SVG.
 */
export function colourFor(map: Record<string, string>, key: unknown): string {
  return typeof key === "string" && Object.hasOwn(map, key) ? map[key] : ACCENT;
}

/**
 * Escape a value for SVG text content.
 *
 * Every card's rendered string is injected with `{@html}` on /share, and
 * card data is rehydrated from sessionStorage (i.e. not guaranteed to match
 * its TypeScript type), so non-strings must be coerced rather than assumed.
 */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
