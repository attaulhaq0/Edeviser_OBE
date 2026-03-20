// Feature: adaptive-quiz-generation, Property 17: CLO discrepancy detection
// **Validates: Requirements 12.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { detectCLODiscrepancy } from '@/lib/questionAnalytics';

describe('detectCLODiscrepancy — property-based tests', () => {
  it('P17a: flags discrepancy when absolute difference > 15', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (quizScore, attainment) => {
          const result = detectCLODiscrepancy(quizScore, attainment);
          if (Math.abs(quizScore - attainment) > 15) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17b: no discrepancy when scores are equal', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (score) => {
          expect(detectCLODiscrepancy(score, score)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17c: discrepancy detection is symmetric', () => {
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

  it('P17d: difference of exactly 15 (integer values) does not flag', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15, max: 85 }),
        (base) => {
          expect(detectCLODiscrepancy(base, base + 15)).toBe(false);
          expect(detectCLODiscrepancy(base, base - 15)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
