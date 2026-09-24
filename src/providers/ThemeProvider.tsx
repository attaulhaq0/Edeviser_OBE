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
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedProfilePreference } from "@/hooks/useDebouncedProfilePreference";
import { observeThemeColor } from "@/lib/themeColor";

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
  const { user, profile } = useAuth();
  const userId = user?.id;
  const commitPreference = useDebouncedProfilePreference(userId);
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
  const locallyChosenRef = useRef(false);

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  // Auth can change before its new profile finishes loading. Never hydrate the
  // previous account's profile into the next account's preference state.
  const profilePref = profile?.id === userId ? profile?.theme_preference : undefined;

  useEffect(() => {
    locallyChosenRef.current = false;
  }, [userId]);

  // Apply class to html element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Browser chrome follows the resolved semantic background, including live
  // high-contrast changes made by the separate accessibility rendering owner.
  useEffect(() => observeThemeColor(document), []);

  // Hydrate each identity, including cache → fresh-profile updates, unless the
  // user has already made a newer local choice during this session.
  useEffect(() => {
    if (
      userId &&
      !locallyChosenRef.current &&
      profilePref &&
      ["light", "dark", "system"].includes(profilePref)
    ) {
      setStoredTheme(profilePref as ThemePreference);
    }
  }, [userId, profilePref]);

  const setTheme = useCallback(
    (t: ThemePreference) => {
      commitPreference({ theme_preference: t }, () => {
        locallyChosenRef.current = true;
        setStoredTheme(t);
      });
    },
    [commitPreference]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
