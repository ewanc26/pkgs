import { writable } from 'svelte/store';
import { DEFAULT_THEME, THEMES, type ColorTheme, type ThemeDefinition } from '../config/themes.config.js';

const browser = typeof window !== 'undefined';

interface ColorThemeState {
	current: ColorTheme;
	mounted: boolean;
	isSeasonal: boolean;
}

const STORAGE_KEY = 'color-theme';
const SEASONAL_KEY = 'seasonal-theme';

/**
 * Seasonal theme map based on the Wheel of the Year.
 * Themes shift with the natural calendar — cold in winter, warm in spring,
 * bright in summer, earthy in autumn. Uses astronomical seasons (solstices/equinoxes).
 */
function getSeasonalTheme(): ThemeDefinition {
	const now = new Date();
	const month = now.getMonth(); // 0 = Jan
	const day = now.getDate();

	// Northern hemisphere, astronomical seasons:
	// Winter: Dec 21 – Mar 19
	// Spring: Mar 20 – Jun 20
	// Summer: Jun 21 – Sep 21
	// Autumn: Sep 22 – Dec 20

	const isWinter =
		month === 11 && day >= 21 ||
		month === 0 ||
		month === 1 ||
		month === 2 && day < 20;

	const isSpring =
		month === 2 && day >= 20 ||
		month === 3 ||
		month === 4 ||
		month === 5 && day < 21;

	const isSummer =
		month === 5 && day >= 21 ||
		month === 6 ||
		month === 7 ||
		month === 8 && day < 22;

	if (isWinter) return THEMES.find((t) => t.value === 'ocean') ?? THEMES[0];
	if (isSpring) return THEMES.find((t) => t.value === 'sage') ?? THEMES[0];
	if (isSummer) return THEMES.find((t) => t.value === 'amber') ?? THEMES[0];
	// Autumn
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
				// User has explicitly chosen — respect it, no seasonal override
				update((state) => ({ ...state, current: stored as ColorTheme, mounted: true }));
				applyTheme(stored as ColorTheme);
			} else {
				// No stored preference — apply seasonal theme
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