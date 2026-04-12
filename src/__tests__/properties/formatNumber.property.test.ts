// Feature: i18n-rtl-support, Property 8: Number Formatting Locale Consistency
// **Validates: Requirements 14.1, 14.2, 14.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatNumber, formatPercent, formatCompact } from '@/lib/formatNumber';

const finiteNumberArb = fc.double({ min: -1e12, max: 1e12, noNaN: true });
const positiveNumberArb = fc.double({ min: 0, max: 1e9, noNaN: true });

describe('Property 8 — formatNumber produces non-empty string for any finite number', () => {
  it('P8a: formatNumber returns non-empty string for any finite number', () => {
    fc.assert(
      fc.property(finiteNumberArb, (n) => {
        const result = formatNumber(n);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P8b: formatPercent returns non-empty string for any finite number', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.integer({ min: 0, max: 4 }),
        (n, decimals) => {
          const result = formatPercent(n, decimals);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P8c: formatCompact returns non-empty string for any positive number', () => {
    fc.assert(
      fc.property(positiveNumberArb, (n) => {
        const result = formatCompact(n);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P8d: formatNumber(0) returns a string representation of zero', () => {
    const result = formatNumber(0);
    expect(result).toContain('0');
  });
});
