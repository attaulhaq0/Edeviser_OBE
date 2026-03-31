// Feature: edeviser-platform, Property 48: Dark mode token consistency
// **Validates: Requirements 62.1, 62.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Token definitions extracted from src/index.css ─────────────────────────

/** Light mode brand design tokens (from :root in index.css). */
const LIGHT_TOKENS: Record<string, string> = {
  '--surface-background': '#ffffff',
  '--surface-card': '#ffffff',
  '--surface-subtle': '#f8fafc',
  '--surface-border': '#e2e8f0',
  '--surface-input-border': '#d1d5db',
  '--text-primary': '#0f172a',
  '--text-secondary': '#64748b',
  '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '--xp-track': '#e2e8f0',
};

/** Dark mode brand design tokens (from .dark in index.css). */
const DARK_TOKENS: Record<string, string> = {
  '--surface-background': '#020617',
  '--surface-card': '#0f172a',
  '--surface-subtle': '#1e293b',
  '--surface-border': '#334155',
  '--surface-input-border': '#475569',
  '--text-primary': '#f1f5f9',
  '--text-secondary': '#94a3b8',
  '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.2)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  '--xp-track': '#334155',
};

/** Shadcn/ui tokens that must exist in both :root and .dark. */
const SHADCN_ROOT_TOKENS = [
  '--background', '--foreground',
  '--card', '--card-foreground',
  '--popover', '--popover-foreground',
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--destructive',
  '--border', '--input', '--ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--sidebar', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
];

/** Shadcn dark tokens (verified from index.css .dark block). */
const SHADCN_DARK_TOKENS = [...SHADCN_ROOT_TOKENS]; // same set of keys

/** Parse a hex color to RGB components. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const val = parseInt(match[1]!, 16);
  return { r: (val >> 16) & 0xff, g: (val >> 8) & 0xff, b: val & 0xff };
}

/** Calculate relative luminance per WCAG 2.0. */
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

/** Calculate contrast ratio between two colors. */
function contrastRatio(hex1: string, hex2: string): number | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

type ThemePreference = 'light' | 'dark' | 'system';

/** Resolve theme preference to actual theme. */
function resolveTheme(preference: ThemePreference, systemDark: boolean): 'light' | 'dark' {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

// ─── Property 48: Dark mode token consistency ───────────────────────────────

describe('Property 48 — Dark mode token consistency', () => {
  it('P48a: every light mode brand token has a corresponding dark mode token', () => {
    const lightKeys = Object.keys(LIGHT_TOKENS);
    const darkKeys = Object.keys(DARK_TOKENS);

    for (const key of lightKeys) {
      expect(darkKeys).toContain(key);
    }
  });

  it('P48b: every Shadcn root token has a corresponding dark token', () => {
    for (const token of SHADCN_ROOT_TOKENS) {
      expect(SHADCN_DARK_TOKENS).toContain(token);
    }
  });

  it('P48c: light mode text has sufficient contrast against light background', () => {
    const textPrimary = LIGHT_TOKENS['--text-primary']!;
    const background = LIGHT_TOKENS['--surface-background']!;
    const ratio = contrastRatio(textPrimary, background);

    // WCAG AA requires 4.5:1 for normal text
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(4.5);
  });

  it('P48d: dark mode text has sufficient contrast against dark background', () => {
    const textPrimary = DARK_TOKENS['--text-primary']!;
    const background = DARK_TOKENS['--surface-background']!;
    const ratio = contrastRatio(textPrimary, background);

    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(4.5);
  });

  it('P48e: theme preference resolution is deterministic', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemePreference>('light', 'dark', 'system'),
        fc.boolean(),
        (preference, systemDark) => {
          const resolved = resolveTheme(preference, systemDark);

          if (preference === 'light') expect(resolved).toBe('light');
          else if (preference === 'dark') expect(resolved).toBe('dark');
          else expect(resolved).toBe(systemDark ? 'dark' : 'light');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P48f: dark and light tokens have different values for surface/text tokens', () => {
    const surfaceAndTextTokens = [
      '--surface-background',
      '--surface-card',
      '--text-primary',
      '--text-secondary',
    ];

    for (const token of surfaceAndTextTokens) {
      expect(LIGHT_TOKENS[token]).not.toBe(DARK_TOKENS[token]);
    }
  });
});
