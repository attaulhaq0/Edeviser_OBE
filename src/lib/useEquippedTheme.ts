// =============================================================================
// useEquippedTheme — Apply equipped theme CSS vars to student dashboard
// =============================================================================

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEquippedItems } from '@/hooks/useEquippedItems';
import { resolveThemeCSS } from '@/lib/themeResolver';
import type { ThemeMetadata } from '@/lib/themeResolver';

/**
 * Hook that applies the student's equipped profile theme as CSS custom
 * properties on the document root. When the student unequips or has no
 * theme, the variables are removed so the default design-system tokens
 * take effect.
 *
 * Usage: call `useEquippedTheme()` once in StudentLayout or StudentDashboard.
 */
export const useEquippedTheme = () => {
  const { user } = useAuth();
  const { data: equippedItems } = useEquippedItems(user?.id ?? '');

  const themeItem = useMemo(
    () => equippedItems?.find((item) => item.slot === 'profile_theme'),
    [equippedItems],
  );

  useEffect(() => {
    const root = document.documentElement;

    if (!themeItem) {
      // Remove theme CSS vars when no theme is equipped
      root.style.removeProperty('--theme-accent');
      root.style.removeProperty('--theme-accent-dark');
      root.style.removeProperty('--theme-accent-bg');
      root.style.removeProperty('--theme-gradient-start');
      root.style.removeProperty('--theme-gradient-end');
      return;
    }

    const metadata = themeItem.metadata as Partial<ThemeMetadata>;
    const themeData: ThemeMetadata = {
      accent_primary: metadata.accent_primary ?? '#3b82f6',
      accent_secondary: metadata.accent_secondary ?? '#2563eb',
      accent_bg: metadata.accent_bg ?? '#eff6ff',
      gradient_start: metadata.gradient_start ?? '#14b8a6',
      gradient_end: metadata.gradient_end ?? '#3b82f6',
    };

    const cssVars = resolveThemeCSS(themeData);

    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }

    // Cleanup on unmount or theme change
    return () => {
      for (const key of Object.keys(cssVars)) {
        root.style.removeProperty(key);
      }
    };
  }, [themeItem]);

  return { hasTheme: !!themeItem };
};
