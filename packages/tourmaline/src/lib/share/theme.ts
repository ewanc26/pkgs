/**
 * Shared palette, fonts, and escaping helper for every share-card SVG
 * renderer, extracted from personality-svg.ts so receipt/festival/story
 * cards match the same rose theme instead of redefining it three
 * more times.
 */
import { INTER_WOFF2, JETBRAINS_MONO_WOFF2 } from "./fonts/embedded-fonts";

export const BG = "#0f0a0c";
export const SURFACE = "#170f12";
export const BORDER = "#2b1a20";
export const ACCENT = "#fb7185";
export const TEXT = "#e5e7eb";
export const MUTED = "#9ca3af";
export const DIM = "#6b7280";

export const GENRE_COLORS: Record<string, string> = {
  Metal: "#ef9fab",
  Rock: "#a8e6c2",
  Pop: "#ec8b99",
  Electronic: "#96e1b5",
  "Hip Hop": "#e97788",
  Jazz: "#84dba9",
  Classical: "#e66377",
  Folk: "#73d69c",
  Country: "#e25066",
  "R&B": "#61d190",
  Blues: "#df3c54",
  Reggae: "#4fcc83",
  Latin: "#dc2843",
  World: "#3dc777",
  Soundtrack: "#cc213b",
  "New Age": "#35b86c",
  Punk: "#b81e35",
  "Singer-Songwriter": "#30a661",
};

export const MOOD_COLORS: Record<string, string> = {
  Energetic: "#ee96a3",
  Melancholic: "#a0e3bc",
  Chill: "#e76a7d",
  Happy: "#79d8a0",
  Aggressive: "#e03e56",
  Atmospheric: "#51cd85",
  Nostalgic: "#ca213a",
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
