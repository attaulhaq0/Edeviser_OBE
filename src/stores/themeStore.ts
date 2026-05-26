import { create } from "zustand";
import type { AuthContextValue } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

/**
 * Theme mode type: 'light', 'dark', or 'system' (follows OS preference)
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * Effective theme: resolved to either 'light' or 'dark'
 * (derived from themeMode and system preference)
 */
export type EffectiveTheme = "light" | "dark";

/**
 * Theme store state and actions
 */
interface ThemeStore {
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
  _setEffectiveTheme: (theme: EffectiveTheme) => void;
}

/**
 * Detect system color scheme preference
 */
const getSystemTheme = (): EffectiveTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/**
 * Resolve effective theme from themeMode and system preference
 */
const resolveEffectiveTheme = (mode: ThemeMode): EffectiveTheme => {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
};

/**
 * Apply or remove .dark class on document.documentElement
 */
const applyThemeClass = (effectiveTheme: EffectiveTheme) => {
  if (typeof document === "undefined") return;

  if (effectiveTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

/**
 * Create the Zustand theme store
 *
 * Persistence strategy:
 * - Unauth: localStorage (key: 'theme-mode')
 * - Auth: profiles.theme_preference (synced via subscribe-to-authStore bridge)
 *
 * Side effects:
 * - Reactively applies/removes .dark class on document.documentElement
 * - Listens to system color scheme changes when themeMode === 'system'
 */
export const useThemeStore = create<ThemeStore>((set, get) => {
  // Initialize from localStorage
  const storedThemeMode = (() => {
    if (typeof localStorage === "undefined") return "light";
    const stored = localStorage.getItem("theme-mode");
    return (stored as ThemeMode) || "light";
  })();

  const initialEffectiveTheme = resolveEffectiveTheme(storedThemeMode);

  // Apply initial theme class
  applyThemeClass(initialEffectiveTheme);

  // Listen to system color scheme changes
  const mediaQuery =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  const handleSystemThemeChange = () => {
    const currentMode = get().themeMode;
    if (currentMode === "system") {
      const newEffectiveTheme = getSystemTheme();
      set({ effectiveTheme: newEffectiveTheme });
      applyThemeClass(newEffectiveTheme);
    }
  };

  // Use addEventListener for better browser compatibility
  if (mediaQuery) {
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      (mediaQuery as MediaQueryList).addListener(handleSystemThemeChange);
    }
  }

  return {
    themeMode: storedThemeMode,
    effectiveTheme: initialEffectiveTheme,

    setThemeMode: (mode: ThemeMode) => {
      set({ themeMode: mode });
      const newEffectiveTheme = resolveEffectiveTheme(mode);
      set({ effectiveTheme: newEffectiveTheme });
      applyThemeClass(newEffectiveTheme);

      // Persist to localStorage
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme-mode", mode);
      }
    },

    _setEffectiveTheme: (theme: EffectiveTheme) => {
      set({ effectiveTheme: theme });
      applyThemeClass(theme);
    },
  };
});

/**
 * Bridge: subscribe to auth state and sync theme_preference to Supabase
 *
 * This function should be called once during app initialization (e.g., in a root effect)
 * to establish the bidirectional sync between the store and the database.
 *
 * Flow:
 * 1. When user authenticates, load their theme_preference from profiles
 * 2. When user changes theme, persist to profiles.theme_preference
 * 3. When user signs out, revert to localStorage
 */
export const setupThemeAuthBridge = (auth: AuthContextValue) => {
  // When auth state changes, sync theme from profile
  if (auth.user && auth.profile) {
    const profileTheme = (auth.profile.theme_preference ||
      "light") as ThemeMode;
    useThemeStore.setState({ themeMode: profileTheme });
    const effectiveTheme = resolveEffectiveTheme(profileTheme);
    useThemeStore.setState({ effectiveTheme });
    applyThemeClass(effectiveTheme);
  }

  // Subscribe to theme changes and persist to Supabase when authenticated
  let previousThemeMode = useThemeStore.getState().themeMode;

  const unsubscribe = useThemeStore.subscribe((state) => {
    if (previousThemeMode !== state.themeMode && auth.user) {
      previousThemeMode = state.themeMode;
      // Fire-and-forget: persist theme to database
      (async () => {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ theme_preference: state.themeMode })
            .eq("id", auth.user!.id);
          if (error) {
            console.error("Failed to persist theme preference:", error);
          }
        } catch (error) {
          console.error("Failed to persist theme preference:", error);
        }
      })();
    }
  });

  return unsubscribe;
};
