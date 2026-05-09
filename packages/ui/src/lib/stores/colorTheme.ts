import { writable } from 'svelte/store';
import { DEFAULT_THEME, THEMES, type ColorTheme, type ThemeDefinition } from '../config/themes.config.js';

const browser = typeof window !== 'undefined';

interface ColorThemeState {
	current: ColorTheme;
	mounted: boolean;
	isSeasonal: boolean;
}

const STORAGE_KEY = 'color-theme';

/**
 * Wheel of the Year — northern hemisphere, traditional neopagan fixed dates.
 * The eight sabbats: four solar (solstices/equinoxes) and four cross-quarter fire festivals.
 *
 * | Sabbat      | Traditional dates          | Theme          |
 * |-------------|----------------------------|----------------|
 * | Samhain     | Oct 31 – Nov 1             | ocean (deep)   |
 * | Yule        | Dec 20–23                  | slate (cold)   |
 * | Imbolc      | Feb 1–2                    | sage (stirring)|
 * | Ostara      | Mar 19–21                  | sage (growth)  |
 * | Beltane     | Apr 30 – May 1             | amber (fire)   |
 * | Litha       | Jun 20–22                  | amber (light)  |
 * | Lughnasadh  | Aug 1–2                    | coral (harvest)|
 * | Mabon       | Sep 21–24                  | coral (reflect)|
 *
 * Between sabbats, the season in force applies (see the period table below).
 */
function getSeasonalTheme(): ThemeDefinition {
	const now = new Date();
	const month = now.getMonth(); // 0 = Jan
	const day = now.getDate();

	// ── Solar sabbats (solstice/equinox dates) ─────────────────────
	if (month === 11 && day >= 20 && day <= 23) return THEMES.find((t) => t.value === 'slate') ?? THEMES[0]; // Yule
	if (month === 2 && day >= 19 && day <= 21) return THEMES.find((t) => t.value === 'sage') ?? THEMES[0]; // Ostara
	if (month === 5 && day >= 20 && day <= 22) return THEMES.find((t) => t.value === 'amber') ?? THEMES[0]; // Litha
	if (month === 8 && day >= 21 && day <= 24) return THEMES.find((t) => t.value === 'coral') ?? THEMES[0]; // Mabon

	// ── Cross-quarter fire festivals ────────────────────────────────
	if (month === 1 && day >= 1 && day <= 2) return THEMES.find((t) => t.value === 'sage') ?? THEMES[0]; // Imbolc
	if (month === 3 && day === 30) return THEMES.find((t) => t.value === 'amber') ?? THEMES[0]; // Beltane eve
	if (month === 4 && day === 1) return THEMES.find((t) => t.value === 'amber') ?? THEMES[0]; // Beltane
	if (month === 7 && day >= 1 && day <= 2) return THEMES.find((t) => t.value === 'coral') ?? THEMES[0]; // Lughnasadh
	if (month === 9 && day === 31) return THEMES.find((t) => t.value === 'ocean') ?? THEMES[0]; // Samhain
	if (month === 10 && day === 1) return THEMES.find((t) => t.value === 'ocean') ?? THEMES[0]; // Samhain

	// ── Between-sabbat periods ──────────────────────────────────────
	// Jan 3 – Mar 18: deep winter — slate
	if ((month === 0 && day > 2) || (month === 1 && day < 19) || (month === 2 && day < 19)) {
		return THEMES.find((t) => t.value === 'slate') ?? THEMES[0];
	}
	// Mar 22 – Apr 29: spring — sage
	if ((month === 2 && day > 21) || month === 3) {
		return THEMES.find((t) => t.value === 'sage') ?? THEMES[0];
	}
	// May 2 – Jun 19: early summer — amber
	if (month === 4 || (month === 5 && day < 20)) {
		return THEMES.find((t) => t.value === 'amber') ?? THEMES[0];
	}
	// Jun 23 – Sep 20: summer and harvest — coral
	if ((month === 5 && day > 22) || month === 6 || month === 7 || (month === 8 && day < 21)) {
		return THEMES.find((t) => t.value === 'coral') ?? THEMES[0];
	}
	// Sep 25 – Oct 30: autumn darkening — coral
	if (month === 8 || (month === 9 && day < 31)) {
		return THEMES.find((t) => t.value === 'coral') ?? THEMES[0];
	}
	// Nov 2 – Dec 19 + Dec 24+: the dark half — ocean
	if (month === 10 || (month === 11 && day > 23)) {
		return THEMES.find((t) => t.value === 'ocean') ?? THEMES[0];
	}

	// Fallback
	return THEMES.find((t) => t.value === DEFAULT_THEME) ?? THEMES[0];
}

function createColorThemeStore() {
	const { subscribe, set, update } = writable<ColorThemeState>({
		current: DEFAULT_THEME,
		mounted: false,
		isSeasonal: false
	});

	return {
		subscribe,
		init: () => {
			if (!browser) return;

			const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
			const hasUserChoice = stored !== null;

			if (hasUserChoice) {
				update((state) => ({ ...state, current: stored as ColorTheme, mounted: true }));
				applyTheme(stored as ColorTheme);
			} else {
				const seasonal = getSeasonalTheme();
				update((state) => ({
					...state,
					current: seasonal.value as ColorTheme,
					mounted: true,
					isSeasonal: true
				}));
				applyTheme(seasonal.value as ColorTheme);
			}
		},
		setTheme: (theme: ColorTheme) => {
			if (!browser) return;
			localStorage.setItem(STORAGE_KEY, theme);
			update((state) => ({ ...state, current: theme, isSeasonal: false }));
			applyTheme(theme);
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
		}
	};
}

function applyTheme(theme: ColorTheme) {
	if (!browser) return;
	document.documentElement.setAttribute('data-color-theme', theme);
}

export const colorTheme = createColorThemeStore();
export type { ColorTheme };