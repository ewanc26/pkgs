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
 * Wheel of the Year — northern hemisphere, based on the 8 sabbats.
 * Dates are approximate standard neopagan conventions.
 *
 * | Period      | Dates                  | Theme |
 * |-------------|------------------------|-------|
 * | Samhain     | Oct 31 – Nov 20        | dark, the year drawing in |
 * | Yule        | Nov 21 – Jan 4         | deepest dark, winter solstice |
 * | Imbolc      | Jan 5 – Feb 18         | early stirrings, snowdrops |
 * | Ostara      | Feb 19 – Apr 30        | spring equinox, new growth |
 * | Beltane     | May 1 – Jun 20         | fire, brightness, summer begins |
 * | Litha       | Jun 21 – Jul 30        | summer solstice, peak light |
 * | Lughnasadh  | Jul 31 – Sep 21        | first harvest, grain, warmth |
 * | Mabon       | Sep 22 – Oct 30        | autumn equinox, second harvest |
 */
function getSeasonalTheme(): ThemeDefinition {
	const now = new Date();
	const month = now.getMonth(); // 0 = Jan
	const day = now.getDate();

	if ((month === 9) || (month === 10 && day < 21)) {
		// Samhain: Oct 31 – Nov 20
		return THEMES.find((t) => t.value === 'ocean') ?? THEMES[0];
	}

	if ((month === 10 && day >= 21) || (month === 11) || (month === 0 && day < 5)) {
		// Yule: Nov 21 – Jan 4
		return THEMES.find((t) => t.value === 'slate') ?? THEMES[0];
	}

	if ((month === 0 && day >= 5) || (month === 1 && day < 19)) {
		// Imbolc: Jan 5 – Feb 18
		return THEMES.find((t) => t.value === 'sage') ?? THEMES[0];
	}

	if ((month === 1 && day >= 19) || month === 2 || month === 3 || (month === 4 && day < 1)) {
		// Ostara: Feb 19 – Apr 30
		return THEMES.find((t) => t.value === 'sage') ?? THEMES[0];
	}

	if (month === 4 || month === 5 || (month === 6 && day < 21)) {
		// Beltane: May 1 – Jun 20
		return THEMES.find((t) => t.value === 'amber') ?? THEMES[0];
	}

	if ((month === 6 && day >= 21) || month === 7 || (month === 8 && day < 1)) {
		// Litha: Jun 21 – Aug 31
		return THEMES.find((t) => t.value === 'amber') ?? THEMES[0];
	}

	if (month === 8 || (month === 9 && day < 22)) {
		// Lughnasadh: Sep 1 – Sep 21
		return THEMES.find((t) => t.value === 'coral') ?? THEMES[0];
	}

	// Mabon: Sep 22 – Oct 30
	return THEMES.find((t) => t.value === 'coral') ?? THEMES[0];
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