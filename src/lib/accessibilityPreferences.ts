import { z } from 'zod';

export const accessibilityPreferencesSchema = z.object({
  font_size: z.enum(['default', 'large', 'x-large']).default('default'),
  high_contrast: z.boolean().default(false),
  reduced_animations: z.boolean().default(false),
  dyslexia_font: z.boolean().default(false),
  simplified_view: z.boolean().default(false),
});

export type AccessibilityPreferences = z.infer<typeof accessibilityPreferencesSchema>;

const STORAGE_KEY = 'edeviser-accessibility-prefs';

const DEFAULT_PREFS: AccessibilityPreferences = {
  font_size: 'default',
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

export const saveAccessibilityPreferencesLocal = (prefs: AccessibilityPreferences): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

export const applyAccessibilityPreferences = (prefs: AccessibilityPreferences): void => {
  const root = document.documentElement;

  const fontSizeMap: Record<string, string> = {
    default: '16px',
    large: '18px',
    'x-large': '20px',
  };
  root.style.fontSize = fontSizeMap[prefs.font_size] || '16px';

  root.classList.toggle('high-contrast', prefs.high_contrast);
  root.classList.toggle('reduce-animations', prefs.reduced_animations);
  root.classList.toggle('dyslexia-font', prefs.dyslexia_font);
  root.classList.toggle('simplified-view', prefs.simplified_view);
};
