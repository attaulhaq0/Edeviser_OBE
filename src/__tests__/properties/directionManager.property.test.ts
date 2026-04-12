// Feature: i18n-rtl-support, Properties 4 & 7: Direction Manager Idempotence & Mapping
// **Validates: Requirements 2.1, 2.2, 2.3, 2.6**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { getDirection, applyDirection } from '@/lib/directionManager';

const supportedLangArb = fc.constantFrom('en', 'ar');
const anyLangArb = fc.constantFrom('en', 'ar', 'fr', 'de', 'he', 'fa', 'ur', 'zh', 'ja');

describe('Property 4 — Direction Manager idempotence', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
    document.documentElement.style.fontFamily = '';
  });

  it('P4a: calling applyDirection twice with same language produces same state as once', () => {
    fc.assert(
      fc.property(supportedLangArb, (lang) => {
        applyDirection(lang);
        const dir1 = document.documentElement.getAttribute('dir');
        const lang1 = document.documentElement.getAttribute('lang');
        const font1 = document.documentElement.style.fontFamily;

        applyDirection(lang);
        const dir2 = document.documentElement.getAttribute('dir');
        const lang2 = document.documentElement.getAttribute('lang');
        const font2 = document.documentElement.style.fontFamily;

        expect(dir1).toBe(dir2);
        expect(lang1).toBe(lang2);
        expect(font1).toBe(font2);
      }),
      { numRuns: 100 },
    );
  });

  it('P4b: calling applyDirection N times is idempotent', () => {
    fc.assert(
      fc.property(supportedLangArb, fc.integer({ min: 2, max: 10 }), (lang, n) => {
        for (let i = 0; i < n; i++) applyDirection(lang);
        const dir = document.documentElement.getAttribute('dir');
        const langAttr = document.documentElement.getAttribute('lang');

        applyDirection(lang);
        expect(document.documentElement.getAttribute('dir')).toBe(dir);
        expect(document.documentElement.getAttribute('lang')).toBe(langAttr);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 7 — Direction mapping consistency', () => {
  it('P7a: ar maps to rtl, en maps to ltr', () => {
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
  });

  it('P7b: all non-RTL languages map to ltr', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('en', 'fr', 'de', 'zh', 'ja', 'ko', 'es', 'pt'),
        (lang) => {
          expect(getDirection(lang)).toBe('ltr');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7c: all RTL languages map to rtl', () => {
    fc.assert(
      fc.property(fc.constantFrom('ar', 'he', 'fa', 'ur'), (lang) => {
        expect(getDirection(lang)).toBe('rtl');
      }),
      { numRuns: 100 },
    );
  });

  it('P7d: getDirection is a pure function (same input → same output)', () => {
    fc.assert(
      fc.property(anyLangArb, (lang) => {
        const result1 = getDirection(lang);
        const result2 = getDirection(lang);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });
});
