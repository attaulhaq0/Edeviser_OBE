// Task 53: Dark Mode ThemeProvider
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (t: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

// ─── localStorage-backed theme store ────────────────────────────────────────

const THEME_KEY = "theme";
const listeners = new Set<() => void>();

function getStoredTheme(): ThemePreference {
  const v = localStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function setStoredTheme(t: ThemePreference) {
  localStorage.setItem(THEME_KEY, t);
  listeners.forEach((l) => l());
}

function subscribeThemeStore(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// ─── System theme media query ───────────────────────────────────────────────

const mq =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function getSystemTheme(): "light" | "dark" {
  return mq?.matches ? "dark" : "light";
}

function subscribeSystemTheme(callback: () => void) {
  mq?.addEventListener("change", callback);
  return () => {
    mq?.removeEventListener("change", callback);
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  const theme = useSyncExternalStore(
    subscribeThemeStore,
    getStoredTheme,
    () => "system" as ThemePreference
  );
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    () => "light" as const
  );
  const profileSyncedRef = useRef(false);
  // Debounce timer ref — prevents multiple DB writes on rapid theme changes
  const dbWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const profilePref = profile?.theme_preference;

  // Apply class to html element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Sync from profile on first load (one-time hydration)
  useEffect(() => {
    if (
      !profileSyncedRef.current &&
      profilePref &&
      ["light", "dark", "system"].includes(profilePref)
    ) {
      profileSyncedRef.current = true;
      setStoredTheme(profilePref as ThemePreference);
    }
  }, [profilePref]);

  const profileId = profile?.id;

  const setTheme = useCallback(
    (t: ThemePreference) => {
      setStoredTheme(t);

      if (!profileId) return;

      // Debounce: cancel any pending write and schedule a new one after 800ms
      // This prevents multiple DB writes when user rapidly toggles theme
      if (dbWriteTimerRef.current) {
        clearTimeout(dbWriteTimerRef.current);
      }
      dbWriteTimerRef.current = setTimeout(() => {
        supabase
          .from("profiles")
          .update({ theme_preference: t })
          .eq("id", profileId)
          .then(({ error }) => {
            if (error)
              console.error(
                "[ThemeProvider] Failed to sync theme:",
                error.message
              );
          });
      }, 800);
    },
    [profileId]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
