// Feature: adaptive-quiz-generation, Property 17: CLO discrepancy detection
// **Validates: Requirements 12.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { detectCLODiscrepancy } from '@/lib/questionAnalytics';

describe('detectCLODiscrepancy — property-based tests', () => {
  it('P17a: returns true when absolute difference > 15', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (quizScore, cloAttainment) => {
          fc.pre(Math.abs(quizScore - cloAttainment) > 15);
          expect(detectCLODiscrepancy(quizScore, cloAttainment)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17b: returns false when absolute difference <= 15', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: -15, max: 15, noNaN: true }),
        (base, offset) => {
          const cloAttainment = Math.max(0, Math.min(100, base + offset));
          fc.pre(Math.abs(base - cloAttainment) <= 15);
          expect(detectCLODiscrepancy(base, cloAttainment)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17c: is symmetric — detectCLODiscrepancy(a, b) === detectCLODiscrepancy(b, a)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (a, b) => {
          expect(detectCLODiscrepancy(a, b)).toBe(detectCLODiscrepancy(b, a));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17d: equal values always return false', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (value) => {
          expect(detectCLODiscrepancy(value, value)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
