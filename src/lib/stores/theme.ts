import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface ThemeState {
	isDark: boolean;
	mounted: boolean;
}

function createThemeStore() {
	const { subscribe, set, update } = writable<ThemeState>({
		isDark: false,
		mounted: false
	});

	return {
		subscribe,
		init: () => {
			if (!browser) return;

			const stored = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const isDark = stored === 'dark' || (!stored && prefersDark);

			update((state) => ({
				...state,
				isDark,
				mounted: true
			}));

			applyTheme(isDark);

			// Listen for system preference changes
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const handleChange = (e: MediaQueryListEvent) => {
				if (!localStorage.getItem('theme')) {
					update((state) => ({ ...state, isDark: e.matches }));
					applyTheme(e.matches);
				}
			};
			mediaQuery.addEventListener('change', handleChange);

			return () => {
				mediaQuery.removeEventListener('change', handleChange);
			};
		},
		toggle: () => {
			if (!browser) return;

			update((state) => {
				const newIsDark = !state.isDark;
				localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
				applyTheme(newIsDark);
				return { ...state, isDark: newIsDark };
			});
		},
		setTheme: (isDark: boolean) => {
			if (!browser) return;

			localStorage.setItem('theme', isDark ? 'dark' : 'light');
			applyTheme(isDark);
			update((state) => ({ ...state, isDark }));
		}
	};
}

function applyTheme(isDark: boolean) {
	if (!browser) return;

	const htmlElement = document.documentElement;

	if (isDark) {
		htmlElement.classList.add('dark');
		htmlElement.style.colorScheme = 'dark';
	} else {
		htmlElement.classList.remove('dark');
		htmlElement.style.colorScheme = 'light';
	}
}

export const themeStore = createThemeStore();
