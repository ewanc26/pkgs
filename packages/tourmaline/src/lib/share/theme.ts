/**
 * Shared palette, fonts, and escaping helper for every share-card SVG
 * renderer, extracted from personality-svg.ts so receipt/festival/story
 * cards match the same rose theme instead of redefining it three
 * more times.
 */
import { INTER_WOFF2, JETBRAINS_MONO_WOFF2 } from "./fonts/embedded-fonts";

export const BG = "#0f070a";
export const SURFACE = "#190d12";
export const BORDER = "#3c252d";
export const ACCENT = "#e94984";
export const TEXT = "#e5e7eb";
export const MUTED = "#9ca3af";
export const DIM = "#6b7280";

export const GENRE_COLORS: Record<string, string> = {
  Metal: "#f09dbc",
  Rock: "#a6e7cb",
  Pop: "#ed89ae",
  Electronic: "#94e3c1",
  "Hip Hop": "#ea75a0",
  Jazz: "#82deb6",
  Classical: "#e76193",
  Folk: "#70d9ab",
  Country: "#e44e85",
  "R&B": "#5ed4a1",
  Blues: "#e13a77",
  Reggae: "#4ccf96",
  Latin: "#df2669",
  World: "#3acb8c",
  Soundtrack: "#ce1f5f",
  "New Age": "#32bb80",
  Punk: "#ba1c56",
  "Singer-Songwriter": "#2da973",
};

export const MOOD_COLORS: Record<string, string> = {
  Energetic: "#ef95b6",
  Melancholic: "#9ee5c7",
  Chill: "#e86897",
  Happy: "#76dbaf",
  Aggressive: "#e23c79",
  Atmospheric: "#4ed097",
  Nostalgic: "#cc1e5e",
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
