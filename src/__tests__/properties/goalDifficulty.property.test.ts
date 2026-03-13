// Feature: student-onboarding-profiling, Property 32
// P32: Difficulty classification matches cohort thresholds
// **Validates: Requirements 29.2, 31.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { classifyDifficulty } from '@/lib/goalTemplates';
import { GOAL_DIFFICULTY_THRESHOLDS } from '@/lib/onboardingConstants';

describe('Goal difficulty classification — property-based tests', () => {
  it('P32: cohort rate >= 80 classifies as easy', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 80, max: 100, noNaN: true }),
        (rate) => {
          expect(classifyDifficulty(rate)).toBe('easy');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32: cohort rate >= 50 and < 80 classifies as moderate', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 79.99, noNaN: true }),
        (rate) => {
          expect(classifyDifficulty(rate)).toBe('moderate');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32: cohort rate < 50 classifies as ambitious', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 49.99, noNaN: true }),
        (rate) => {
          expect(classifyDifficulty(rate)).toBe('ambitious');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32: thresholds match constants (easy=80, moderate=50)', () => {
    expect(GOAL_DIFFICULTY_THRESHOLDS.easy).toBe(80);
    expect(GOAL_DIFFICULTY_THRESHOLDS.moderate).toBe(50);
  });

  it('P32: classification is exhaustive — every rate maps to a valid difficulty', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (rate) => {
          const difficulty = classifyDifficulty(rate);
          expect(['easy', 'moderate', 'ambitious']).toContain(difficulty);
        },
      ),
      { numRuns: 200 },
    );
  });
});
