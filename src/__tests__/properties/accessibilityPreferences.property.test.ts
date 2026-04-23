// Feature: i18n-rtl-support, Property 11: Accessibility Preferences Persistence Round-Trip
// **Validates: Requirements 23.5, 23.6**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  loadAccessibilityPreferences,
  saveAccessibilityPreferencesLocal,
  type AccessibilityPreferences,
} from '@/lib/accessibilityPreferences';

const fontSizeArb = fc.constantFrom('default' as const, 'large' as const, 'x-large' as const);

const accessibilityPrefsArb: fc.Arbitrary<AccessibilityPreferences> = fc.record({
  font_size: fontSizeArb,
  high_contrast: fc.boolean(),
  reduced_animations: fc.boolean(),
  dyslexia_font: fc.boolean(),
  simplified_view: fc.boolean(),
});

describe('Property 11 — Accessibility preferences localStorage round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('P11a: save then load returns equivalent object', () => {
    fc.assert(
      fc.property(accessibilityPrefsArb, (prefs) => {
        localStorage.clear();
        saveAccessibilityPreferencesLocal(prefs);
        const loaded = loadAccessibilityPreferences();
        expect(loaded).toEqual(prefs);
      }),
      { numRuns: 100 },
    );
  });

  it('P11b: loading without saving returns defaults', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        localStorage.clear();
        const loaded = loadAccessibilityPreferences();
        expect(loaded).toEqual({
          font_size: 'default',
          high_contrast: false,
          reduced_animations: false,
          dyslexia_font: false,
          simplified_view: false,
        });
      }),
      { numRuns: 100 },
    );
  });

  it('P11c: loading with corrupted data returns defaults', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (garbage) => {
          localStorage.clear();
          localStorage.setItem('edeviser-accessibility-prefs', garbage);
          const loaded = loadAccessibilityPreferences();
          expect(loaded.font_size).toBeDefined();
          expect(typeof loaded.high_contrast).toBe('boolean');
        },
      ),
      { numRuns: 100 },
    );
  });
});
