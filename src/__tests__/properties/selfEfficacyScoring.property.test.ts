// Feature: student-onboarding-profiling, Property 21, 23
// P21: Self-efficacy scores bounded [0, 100]
// P23: Self-efficacy score calculation is deterministic
// **Validates: Requirements 21.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateSelfEfficacyScores, type SelfEfficacyResponseInput } from '@/lib/scoreCalculator';

const SE_DOMAINS = ['general_academic', 'course_specific', 'self_regulated_learning'] as const;

const selfEfficacyResponseArb = (domain: string): fc.Arbitrary<SelfEfficacyResponseInput> =>
  fc.record({
    domain: fc.constant(domain),
    selected_option: fc.integer({ min: 1, max: 5 }),
  });

/** Full set: 2 items per domain = 6 total */
const fullSelfEfficacyArb: fc.Arbitrary<SelfEfficacyResponseInput[]> =
  fc.tuple(
    ...SE_DOMAINS.map((d) => fc.array(selfEfficacyResponseArb(d), { minLength: 2, maxLength: 2 })),
  ).map((a) => a.flat());

/** Partial set: 0-3 items per domain (Day 1 scenario) */
const partialSelfEfficacyArb: fc.Arbitrary<SelfEfficacyResponseInput[]> =
  fc.tuple(
    ...SE_DOMAINS.map((d) => fc.array(selfEfficacyResponseArb(d), { minLength: 0, maxLength: 3 })),
  ).map((a) => a.flat()).filter((arr) => arr.length > 0);

describe('calculateSelfEfficacyScores — property-based tests', () => {
  it('P21: all domain scores and overall are bounded [0, 100] for full responses', () => {
    fc.assert(
      fc.property(fullSelfEfficacyArb, (responses) => {
        const scores = calculateSelfEfficacyScores(responses);
        expect(scores.overall).toBeGreaterThanOrEqual(0);
        expect(scores.overall).toBeLessThanOrEqual(100);
        expect(Number.isInteger(scores.overall)).toBe(true);

        for (const domain of SE_DOMAINS) {
          expect(scores[domain]).toBeGreaterThanOrEqual(0);
          expect(scores[domain]).toBeLessThanOrEqual(100);
          expect(Number.isInteger(scores[domain])).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P21: all scores bounded [0, 100] for partial responses', () => {
    fc.assert(
      fc.property(partialSelfEfficacyArb, (responses) => {
        const scores = calculateSelfEfficacyScores(responses);
        expect(scores.overall).toBeGreaterThanOrEqual(0);
        expect(scores.overall).toBeLessThanOrEqual(100);

        for (const domain of SE_DOMAINS) {
          expect(scores[domain]).toBeGreaterThanOrEqual(0);
          expect(scores[domain]).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P23: score calculation is deterministic — same inputs produce same outputs', () => {
    fc.assert(
      fc.property(fullSelfEfficacyArb, (responses) => {
        const first = calculateSelfEfficacyScores(responses);
        const second = calculateSelfEfficacyScores(responses);
        expect(first).toEqual(second);
      }),
      { numRuns: 100 },
    );
  });
});
