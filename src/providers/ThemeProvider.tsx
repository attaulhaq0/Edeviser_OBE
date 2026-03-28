// Task 53: Dark Mode ThemeProvider
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

// ─── localStorage-backed theme store ────────────────────────────────────────

const THEME_KEY = 'theme';
const listeners = new Set<() => void>();

function getStoredTheme(): ThemePreference {
  const v = localStorage.getItem(THEME_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

function setStoredTheme(t: ThemePreference) {
  localStorage.setItem(THEME_KEY, t);
  listeners.forEach((l) => l());
}

function subscribeThemeStore(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

// ─── System theme media query ───────────────────────────────────────────────

const mq = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function getSystemTheme(): 'light' | 'dark' {
  return mq?.matches ? 'dark' : 'light';
}

function subscribeSystemTheme(callback: () => void) {
  mq?.addEventListener('change', callback);
  return () => { mq?.removeEventListener('change', callback); };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  const theme = useSyncExternalStore(subscribeThemeStore, getStoredTheme, () => 'system' as ThemePreference);
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemTheme, () => 'light' as const);
  const [profileSynced, setProfileSynced] = useState(false);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Apply class to html element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Sync from profile on first load
  const profilePref = profile?.theme_preference;
  if (!profileSynced && profilePref && ['light', 'dark', 'system'].includes(profilePref)) {
    setProfileSynced(true);
    setStoredTheme(profilePref as ThemePreference);
  }

  const profileId = profile?.id;
  const setTheme = (t: ThemePreference) => {
    setStoredTheme(t);
    if (profileId) {
      supabase.from('profiles').update({ theme_preference: t }).eq('id', profileId);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
