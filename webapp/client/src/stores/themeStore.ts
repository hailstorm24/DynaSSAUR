import { create } from 'zustand';

const THEME_KEY = 'dynassaur_theme';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: localStorage.getItem(THEME_KEY) !== 'light',
  toggleTheme: () =>
    set((s) => {
      const next = !s.isDark;
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return { isDark: next };
    }),
}));
