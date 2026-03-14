// Feature: student-onboarding-profiling, Property 27
// P27: Day 1 produces valid preliminary profile with partial scores
// **Validates: Requirements 24.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateBigFiveScores,
  calculateSelfEfficacyScores,
  calculateProfileCompleteness,
  type PersonalityResponse,
  type SelfEfficacyResponseInput,
} from '@/lib/scoreCalculator';

// Day 1: 3 personality items (1 openness, 1 conscientiousness, 1 extraversion)
// Day 1: 2 self-efficacy items (1 general_academic, 1 self_regulated_learning)

const day1PersonalityArb: fc.Arbitrary<PersonalityResponse[]> = fc.tuple(
  fc.record({ dimension: fc.constant('openness'), selected_option: fc.integer({ min: 1, max: 5 }), weight: fc.constantFrom(1, -1) }),
  fc.record({ dimension: fc.constant('conscientiousness'), selected_option: fc.integer({ min: 1, max: 5 }), weight: fc.constantFrom(1, -1) }),
  fc.record({ dimension: fc.constant('extraversion'), selected_option: fc.integer({ min: 1, max: 5 }), weight: fc.constantFrom(1, -1) }),
).map(([a, b, c]) => [a, b, c]);

const day1SelfEfficacyArb: fc.Arbitrary<SelfEfficacyResponseInput[]> = fc.tuple(
  fc.record({ domain: fc.constant('general_academic'), selected_option: fc.integer({ min: 1, max: 5 }) }),
  fc.record({ domain: fc.constant('self_regulated_learning'), selected_option: fc.integer({ min: 1, max: 5 }) }),
).map(([a, b]) => [a, b]);

describe('Day 1 profile — property-based tests', () => {
  it('P27: Day 1 produces valid preliminary profile with partial scores', () => {
    fc.assert(
      fc.property(day1PersonalityArb, day1SelfEfficacyArb, (personalityResponses, selfEfficacyResponses) => {
        // Calculate partial Big Five scores
        const bigFive = calculateBigFiveScores(personalityResponses);

        // 3 dimensions should have scores > 0 (openness, conscientiousness, extraversion)
        expect(bigFive.openness).toBeGreaterThanOrEqual(0);
        expect(bigFive.openness).toBeLessThanOrEqual(100);
        expect(bigFive.conscientiousness).toBeGreaterThanOrEqual(0);
        expect(bigFive.conscientiousness).toBeLessThanOrEqual(100);
        expect(bigFive.extraversion).toBeGreaterThanOrEqual(0);
        expect(bigFive.extraversion).toBeLessThanOrEqual(100);

        // 2 dimensions should be 0 (no responses for agreeableness, neuroticism)
        expect(bigFive.agreeableness).toBe(0);
        expect(bigFive.neuroticism).toBe(0);

        // Calculate partial self-efficacy scores
        const selfEfficacy = calculateSelfEfficacyScores(selfEfficacyResponses);
        expect(selfEfficacy.overall).toBeGreaterThanOrEqual(0);
        expect(selfEfficacy.overall).toBeLessThanOrEqual(100);
        expect(selfEfficacy.general_academic).toBeGreaterThanOrEqual(0);
        expect(selfEfficacy.general_academic).toBeLessThanOrEqual(100);
        expect(selfEfficacy.self_regulated_learning).toBeGreaterThanOrEqual(0);
        expect(selfEfficacy.self_regulated_learning).toBeLessThanOrEqual(100);
        // course_specific has no responses
        expect(selfEfficacy.course_specific).toBe(0);

        // Profile completeness: 3/25 personality + 2/6 self-efficacy + 0 others
        const completeness = calculateProfileCompleteness({
          personality_items: 3,
          self_efficacy_items: 2,
          study_strategy_items: 0,
          learning_style_items: 0,
          baseline_courses: 0,
        });
        expect(completeness).toBeGreaterThan(0);
        expect(completeness).toBeLessThan(100);
      }),
      { numRuns: 100 },
    );
  });
});
