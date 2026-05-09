import { writable } from 'svelte/store';
import { DEFAULT_THEME, THEMES, type ColorTheme, type ThemeDefinition } from '../config/themes.config.js';

const browser = typeof window !== 'undefined';

interface ColorThemeState {
	current: ColorTheme;
	mounted: boolean;
	isSeasonal: boolean;
}

const STORAGE_KEY = 'color-theme';

// Module-level interval handle, cleared on hot-reload or explicit destroy
let _intervalId: ReturnType<typeof setInterval> | null = null;

function tv(value: string): ThemeDefinition {
	return THEMES.find((t) => t.value === value) ?? THEMES[0];
}

/**
 * Wheel of the Year — northern hemisphere, traditional neopagan fixed dates.
 *
 * Eight sabbats each have their own seasonal theme. Between sabbats, the
 * theme follows the season in force, creating a smooth arc through the year.
 *
 * | Sabbat      | Dates              | Theme  | Character               |
 * |-------------|--------------------|--------|-------------------------|
 * | Samhain     | Oct 31 – Nov 1     | ocean  | dark half begins        |
 * | Yule        | Dec 20–23          | slate  | deepest dark            |
 * | Imbolc      | Feb 1–2            | frost  | candlelit stirrings     |
 * | Ostara      | Mar 19–21          | sage   | new life, growth        |
 * | Beltane     | Apr 30 – May 1      | ember  | fire, summer begins     |
 * | Litha       | Jun 20–22          | amber  | peak light, abundance   |
 * | Lughnasadh  | Aug 1–2            | copper | first harvest            |
 * | Mabon       | Sep 21–24          | rust   | autumn equinox           |
 *
 * Between sabbats:
 * - Nov 2 – Dec 19: dark half (ocean)
 * - Dec 24 – Feb 18: deep winter (slate)
 * - Mar 22 – Apr 29: spring (sage)
 * - May 2 – Jun 19: early summer (ember)
 * - Jun 23 – Aug 31: high summer (amber)
 * - Sep 1 – Sep 20: late harvest (copper)
 * - Sep 25 – Oct 30: autumn darkening (rust)
 */
function getSeasonalTheme(): ThemeDefinition {
	const now = new Date();
	const month = now.getMonth(); // 0 = Jan
	const day = now.getDate();

	// ── Solar sabbats ───────────────────────────────────────────
	if (month === 11 && day >= 20 && day <= 23) return tv('slate');    // Yule
	if (month === 2  && day >= 19 && day <= 21) return tv('sage');     // Ostara
	if (month === 5  && day >= 20 && day <= 22) return tv('amber');     // Litha
	if (month === 8  && day >= 21 && day <= 24) return tv('rust');       // Mabon

	// ── Cross-quarter fire festivals ──────────────────────────
	if (month === 1  && day >= 1   && day <= 2)   return tv('frost');   // Imbolc
	if (month === 3  && day === 30)               return tv('ember');    // Beltane eve
	if (month === 4  && day === 1)               return tv('ember');    // Beltane
	if (month === 7  && day >= 1   && day <= 2)   return tv('copper');  // Lughnasadh
	if (month === 9  && day === 31)               return tv('ocean');    // Samhain
	if (month === 10 && day === 1)               return tv('ocean');    // Samhain

	// ── Between-sabbat periods ───────────────────────────────────
	// Ordered by calendar position, no overlaps
	// Nov 2 – Dec 19: the dark half
	if (month === 10 || (month === 11 && day >= 2 && day < 20)) return tv('ocean');
	// Dec 24 – Feb 18: deep winter
	if ((month === 11 && day >= 24) || month === 0 || (month === 1 && day < 1)) return tv('slate');
	// Feb 3 – Mar 18: winter waning toward spring
	if (month === 1 || (month === 2 && day < 19)) return tv('slate');
	// Mar 22 – Apr 29: spring
	if ((month === 2 && day > 21) || month === 3) return tv('sage');
	// May 2 – Jun 19: early summer
	if (month === 4 || (month === 5 && day < 20)) return tv('ember');
	// Jun 23 – Aug 31: high summer
	if ((month === 5 && day > 22) || month === 6 || month === 7) return tv('amber');
	// Sep 1 – Sep 20: late harvest
	if (month === 7 || (month === 8 && day < 21)) return tv('copper');
	// Sep 25 – Oct 30: autumn darkening
	if (month === 8 || (month === 9 && day < 31)) return tv('rust');

	// Fallback
	return tv(DEFAULT_THEME);
}

/** Seconds until the next sabbat or period boundary at midnight. */
function msUntilNextBoundary(): number {
	const now = new Date();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);
	return tomorrow.getTime() - now.getTime();
}

function createColorThemeStore() {
	const { subscribe, update } = writable<ColorThemeState>({
		current: DEFAULT_THEME,
		mounted: false,
		isSeasonal: false
	});

	function startSeasonalTick() {
		// Clear any existing interval (e.g. from a previous init call on HMR)
		if (_intervalId !== null) {
			clearInterval(_intervalId);
		}

		_intervalId = setInterval(() => {
			// Re-read current state to check isSeasonal
			let current: ColorThemeState = { current: DEFAULT_THEME, mounted: false, isSeasonal: false };
			const unsub = subscribe((s) => {
				current = s;
			});
			unsub();

			if (!current.isSeasonal) {
				clearInterval(_intervalId!);
				_intervalId = null;
				return;
			}

			const expected = getSeasonalTheme();
			if (expected.value !== current.current) {
				update((state) => ({
					...state,
					current: expected.value as ColorTheme
				}));
				applyTheme(expected.value as ColorTheme);
			}
		}, 60_000); // Check every minute
	}

	return {
		subscribe,
		init: () => {
			if (!browser) return;

			const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;

			if (stored) {
				update((state) => ({ ...state, current: stored as ColorTheme, mounted: true }));
				applyTheme(stored as ColorTheme);
				// No seasonal tick needed — user has overridden
				if (_intervalId !== null) {
					clearInterval(_intervalId);
					_intervalId = null;
				}
			} else {
				const seasonal = getSeasonalTheme();
				update((state) => ({
					...state,
					current: seasonal.value as ColorTheme,
					mounted: true,
					isSeasonal: true
				}));
				applyTheme(seasonal.value as ColorTheme);
				startSeasonalTick();
			}
		},
		setTheme: (theme: ColorTheme) => {
			if (!browser) return;
			localStorage.setItem(STORAGE_KEY, theme);
			update((state) => ({ ...state, current: theme, isSeasonal: false }));
			applyTheme(theme);
			if (_intervalId !== null) {
				clearInterval(_intervalId);
				_intervalId = null;
			}
		},
		resetToSeasonal: () => {
			if (!browser) return;
			localStorage.removeItem(STORAGE_KEY);
			const seasonal = getSeasonalTheme();
			update((state) => ({
				...state,
				current: seasonal.value as ColorTheme,
				isSeasonal: true
			}));
			applyTheme(seasonal.value as ColorTheme);
			startSeasonalTick();
		}
	};
}

function applyTheme(theme: ColorTheme) {
	if (!browser) return;
	document.documentElement.setAttribute('data-color-theme', theme);
}

export const colorTheme = createColorThemeStore();
export type { ColorTheme };