import { z } from "zod";
import { applyDyslexiaFont } from "@/lib/fontPreferences";

export const accessibilityPreferencesSchema = z.object({
  font_size: z.enum(["default", "large", "x-large"]).default("default"),
  high_contrast: z.boolean().default(false),
  reduced_animations: z.boolean().default(false),
  dyslexia_font: z.boolean().default(false),
  simplified_view: z.boolean().default(false),
});

export type AccessibilityPreferences = z.infer<
  typeof accessibilityPreferencesSchema
>;

const STORAGE_KEY = "edeviser-accessibility-prefs";

const DEFAULT_PREFS: AccessibilityPreferences = {
  font_size: "default",
  high_contrast: false,
  reduced_animations: false,
  dyslexia_font: false,
  simplified_view: false,
};

export const loadAccessibilityPreferences = (): AccessibilityPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFS;
    return accessibilityPreferencesSchema.parse(JSON.parse(stored));
  } catch {
    return DEFAULT_PREFS;
  }
};

export type AccessibilityPersistenceOutcome =
  | { saved: true; error: null }
  | { saved: false; error: Error };

/** Device storage is best-effort; a denied write must not prevent rendering. */
export const persistAccessibilityPreferencesLocal = (
  prefs: AccessibilityPreferences,
): AccessibilityPersistenceOutcome => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return { saved: true, error: null };
  } catch (error: unknown) {
    return { saved: false, error: error instanceof Error ? error : new Error("Device preference storage is unavailable") };
  }
};

/** Compatibility entry point; detailed callers use the outcome helper above. */
export const saveAccessibilityPreferencesLocal = (
  prefs: AccessibilityPreferences,
): void => {
  persistAccessibilityPreferencesLocal(prefs);
};

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** CSS reduction follows the stored choice OR the live OS preference. Rendering
 * only: never changes the requested preference, device storage or account. */
export const applyAccessibilityMotionPreference = (
  storedReduction: boolean,
  systemReduction = typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia(REDUCED_MOTION_QUERY).matches,
): void => {
  document.documentElement.classList.toggle("reduce-animations", storedReduction || systemReduction);
};

export const applyAccessibilityPreferences = (
  prefs: AccessibilityPreferences
): void => {
  const root = document.documentElement;

  const fontSizeMap: Record<string, string> = {
    default: "16px",
    large: "18px",
    "x-large": "20px",
  };
  root.style.fontSize = fontSizeMap[prefs.font_size] || "16px";

  root.classList.toggle("high-contrast", prefs.high_contrast);
  applyAccessibilityMotionPreference(prefs.reduced_animations);
  applyDyslexiaFont(prefs.dyslexia_font);
  root.classList.toggle("simplified-view", prefs.simplified_view);
};
