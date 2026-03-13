// Feature: student-onboarding-profiling, Property 22, 24
// P22: Study strategy dimension scores bounded [0, 100]
// P24: Study strategy score calculation is deterministic
// **Validates: Requirements 22.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateStudyStrategyScores, type StudyStrategyResponseInput } from '@/lib/scoreCalculator';

const SS_DIMENSIONS = ['time_management', 'elaboration', 'self_testing', 'help_seeking'] as const;

const studyStrategyResponseArb = (dimension: string): fc.Arbitrary<StudyStrategyResponseInput> =>
  fc.record({
    dimension: fc.constant(dimension),
    selected_option: fc.integer({ min: 1, max: 5 }),
  });

/** Full set: 2 items per dimension = 8 total */
const fullStudyStrategyArb: fc.Arbitrary<StudyStrategyResponseInput[]> =
  fc.tuple(
    ...SS_DIMENSIONS.map((d) => fc.array(studyStrategyResponseArb(d), { minLength: 2, maxLength: 2 })),
  ).map((a) => a.flat());

/** Partial set: 0-3 items per dimension */
const partialStudyStrategyArb: fc.Arbitrary<StudyStrategyResponseInput[]> =
  fc.tuple(
    ...SS_DIMENSIONS.map((d) => fc.array(studyStrategyResponseArb(d), { minLength: 0, maxLength: 3 })),
  ).map((a) => a.flat()).filter((arr) => arr.length > 0);

describe('calculateStudyStrategyScores — property-based tests', () => {
  it('P22: all dimension scores are bounded [0, 100] for full responses', () => {
    fc.assert(
      fc.property(fullStudyStrategyArb, (responses) => {
        const scores = calculateStudyStrategyScores(responses);
        for (const dim of SS_DIMENSIONS) {
          expect(scores[dim]).toBeGreaterThanOrEqual(0);
          expect(scores[dim]).toBeLessThanOrEqual(100);
          expect(Number.isInteger(scores[dim])).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P22: all dimension scores bounded [0, 100] for partial responses', () => {
    fc.assert(
      fc.property(partialStudyStrategyArb, (responses) => {
        const scores = calculateStudyStrategyScores(responses);
        for (const dim of SS_DIMENSIONS) {
          expect(scores[dim]).toBeGreaterThanOrEqual(0);
          expect(scores[dim]).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P24: score calculation is deterministic — same inputs produce same outputs', () => {
    fc.assert(
      fc.property(fullStudyStrategyArb, (responses) => {
        const first = calculateStudyStrategyScores(responses);
        const second = calculateStudyStrategyScores(responses);
        expect(first).toEqual(second);
      }),
      { numRuns: 100 },
    );
  });
});
