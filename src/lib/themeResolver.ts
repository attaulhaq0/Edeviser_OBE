/**
 * Pure function to resolve theme/frame metadata into CSS custom properties.
 *
 * Takes a theme metadata object (JSON with color values) and returns a
 * Record<string, string> mapping CSS variable names to values.
 *
 * Supported metadata keys → CSS custom properties:
 *   primary       → --brand-primary
 *   primaryDark   → --brand-primary-dark
 *   secondary     → --brand-secondary
 *   gradientStart → --gradient-start
 *   gradientEnd   → --gradient-end
 *   accent        → --theme-accent
 *   surface       → --theme-surface
 *   text          → --theme-text
 */

const THEME_KEY_TO_CSS_VAR: Record<string, string> = {
  primary: '--brand-primary',
  primaryDark: '--brand-primary-dark',
  secondary: '--brand-secondary',
  gradientStart: '--gradient-start',
  gradientEnd: '--gradient-end',
  accent: '--theme-accent',
  surface: '--theme-surface',
  text: '--theme-text',
};

export interface ThemeMetadata {
  [key: string]: unknown;
}

export const resolveThemeProperties = (
  metadata: ThemeMetadata,
): Record<string, string> => {
  const cssProperties: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const cssVar = THEME_KEY_TO_CSS_VAR[key];
    if (cssVar && typeof value === 'string' && value.length > 0) {
      cssProperties[cssVar] = value;
    }
  }

  return cssProperties;
};
