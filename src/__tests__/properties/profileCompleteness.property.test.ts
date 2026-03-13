// Feature: student-onboarding-profiling, Property 25, 26
// P25: Profile completeness bounded [0, 100]
// P26: Profile completeness is monotonically non-decreasing
// **Validates: Requirements 26.2, 26.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateProfileCompleteness, type ProfileCompletenessInput } from '@/lib/scoreCalculator';

const profileCompletenessInputArb: fc.Arbitrary<ProfileCompletenessInput> = fc.record({
  personality_items: fc.integer({ min: 0, max: 25 }),
  self_efficacy_items: fc.integer({ min: 0, max: 6 }),
  study_strategy_items: fc.integer({ min: 0, max: 8 }),
  learning_style_items: fc.integer({ min: 0, max: 16 }),
  baseline_courses: fc.integer({ min: 0, max: 5 }),
});

describe('calculateProfileCompleteness — property-based tests', () => {
  it('P25: profile completeness is bounded [0, 100] for any valid input', () => {
    fc.assert(
      fc.property(profileCompletenessInputArb, (input) => {
        const completeness = calculateProfileCompleteness(input);
        expect(completeness).toBeGreaterThanOrEqual(0);
        expect(completeness).toBeLessThanOrEqual(100);
        expect(Number.isInteger(completeness)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('P25: completeness is exactly 0 when no items are completed', () => {
    const empty: ProfileCompletenessInput = {
      personality_items: 0,
      self_efficacy_items: 0,
      study_strategy_items: 0,
      learning_style_items: 0,
      baseline_courses: 0,
    };
    expect(calculateProfileCompleteness(empty)).toBe(0);
  });

  it('P25: completeness is exactly 100 when all items are completed', () => {
    const full: ProfileCompletenessInput = {
      personality_items: 25,
      self_efficacy_items: 6,
      study_strategy_items: 8,
      learning_style_items: 16,
      baseline_courses: 1,
    };
    expect(calculateProfileCompleteness(full)).toBe(100);
  });

  it('P26: completeness is monotonically non-decreasing as items are added', () => {
    fc.assert(
      fc.property(profileCompletenessInputArb, (input) => {
        const base = calculateProfileCompleteness(input);

        // Adding more personality items should not decrease completeness
        if (input.personality_items < 25) {
          const more = { ...input, personality_items: input.personality_items + 1 };
          expect(calculateProfileCompleteness(more)).toBeGreaterThanOrEqual(base);
        }

        // Adding more self-efficacy items
        if (input.self_efficacy_items < 6) {
          const more = { ...input, self_efficacy_items: input.self_efficacy_items + 1 };
          expect(calculateProfileCompleteness(more)).toBeGreaterThanOrEqual(base);
        }

        // Adding more study strategy items
        if (input.study_strategy_items < 8) {
          const more = { ...input, study_strategy_items: input.study_strategy_items + 1 };
          expect(calculateProfileCompleteness(more)).toBeGreaterThanOrEqual(base);
        }

        // Adding more learning style items
        if (input.learning_style_items < 16) {
          const more = { ...input, learning_style_items: input.learning_style_items + 1 };
          expect(calculateProfileCompleteness(more)).toBeGreaterThanOrEqual(base);
        }

        // Adding baseline courses
        if (input.baseline_courses === 0) {
          const more = { ...input, baseline_courses: 1 };
          expect(calculateProfileCompleteness(more)).toBeGreaterThanOrEqual(base);
        }
      }),
      { numRuns: 200 },
    );
  });
});
