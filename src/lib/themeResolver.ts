// =============================================================================
// Theme Resolver — Pure functions: resolve cosmetic metadata to CSS properties
// =============================================================================

export interface ThemeMetadata {
  accent_primary: string;
  accent_secondary: string;
  accent_bg: string;
  gradient_start: string;
  gradient_end: string;
}

export interface FrameMetadata {
  border_color: string;
  border_width: string;
  border_style?: string;
  border_radius?: string;
  box_shadow?: string;
}

/**
 * Resolve profile theme metadata into CSS custom properties.
 *
 * Maps theme accent colours to CSS variables that override the default
 * design-system tokens on the student dashboard.
 */
export function resolveThemeCSS(
  theme: ThemeMetadata,
): Record<string, string> {
  return {
    '--theme-accent': theme.accent_primary,
    '--theme-accent-dark': theme.accent_secondary,
    '--theme-accent-bg': theme.accent_bg,
    '--theme-gradient-start': theme.gradient_start,
    '--theme-gradient-end': theme.gradient_end,
  };
}

/**
 * Resolve avatar frame metadata into CSS custom properties.
 *
 * Produces border and glow properties that wrap the student's profile picture.
 */
export function resolveFrameCSS(
  frame: FrameMetadata,
): Record<string, string> {
  const css: Record<string, string> = {
    '--frame-border-color': frame.border_color,
    '--frame-border-width': frame.border_width,
  };

  if (frame.border_style) {
    css['--frame-border-style'] = frame.border_style;
  }

  if (frame.border_radius) {
    css['--frame-border-radius'] = frame.border_radius;
  }

  if (frame.box_shadow) {
    css['--frame-glow'] = frame.box_shadow;
  }

  return css;
}
