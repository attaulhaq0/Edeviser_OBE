/**
 * useTheme — unified theme hook
 *
 * Delegates to ThemeProvider (the single source of truth for theme state).
 * ThemeProvider is mounted in App.tsx and handles:
 * - localStorage persistence (key: 'theme')
 * - Supabase profiles.theme_preference sync
 * - System preference detection
 * - .dark class application on document.documentElement
 *
 * Design: ADR-01
 * Requirements: 2.10
 */

import {
  useTheme as useThemeProvider,
  type ThemePreference,
} from "@/providers/ThemeProvider";

export type ThemeMode = ThemePreference; // 'light' | 'dark' | 'system'

/**
 * Hook to access and control the theme.
 *
 * Returns:
 * - themeMode: current theme preference ('light', 'dark', or 'system')
 * - effectiveTheme: resolved theme ('light' or 'dark')
 * - setThemeMode: function to change the theme preference
 */
export const useTheme = () => {
  const { theme, resolvedTheme, setTheme } = useThemeProvider();

  return {
    themeMode: theme,
    effectiveTheme: resolvedTheme,
    setThemeMode: setTheme,
  };
};
