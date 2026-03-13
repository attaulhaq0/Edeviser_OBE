// Feature: student-onboarding-profiling, Property 6, 12
// P6: Baseline score = % correct
// P12: Unanswered baseline questions score as zero
// **Validates: Requirements 8.3, 8.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateBaselineScores, type BaselineResponseInput } from '@/lib/scoreCalculator';

const cloIdArb = fc.uuid();

const baselineResponseArb = (cloId: string): fc.Arbitrary<BaselineResponseInput> =>
  fc.record({
    clo_id: fc.constant(cloId),
    selected_option: fc.integer({ min: 0, max: 3 }),
    correct_option: fc.integer({ min: 0, max: 3 }),
  });

/** Generates responses for 1-5 CLOs, 1-10 questions each */
const baselineResponseSetArb: fc.Arbitrary<BaselineResponseInput[]> =
  fc.array(cloIdArb, { minLength: 1, maxLength: 5 }).chain((cloIds) => {
    const uniqueCloIds = [...new Set(cloIds)];
    return fc.tuple(
      ...uniqueCloIds.map((id) =>
        fc.array(baselineResponseArb(id), { minLength: 1, maxLength: 10 }),
      ),
    ).map((arrays) => arrays.flat());
  });

describe('calculateBaselineScores — property-based tests', () => {
  it('P6: baseline score equals Math.round((correct_count / question_count) * 100)', () => {
    fc.assert(
      fc.property(baselineResponseSetArb, (responses) => {
        const results = calculateBaselineScores(responses);

        for (const result of results) {
          const cloResponses = responses.filter((r) => r.clo_id === result.clo_id);
          const correctCount = cloResponses.filter((r) => r.selected_option === r.correct_option).length;
          const expectedScore = Math.round((correctCount / cloResponses.length) * 100);

          expect(result.score).toBe(expectedScore);
          expect(result.question_count).toBe(cloResponses.length);
          expect(result.correct_count).toBe(correctCount);
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P12: unanswered questions (selected_option !== correct_option) contribute 0 to correct_count', () => {
    fc.assert(
      fc.property(
        cloIdArb,
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (cloId, answeredCount, unansweredCount) => {
          if (answeredCount + unansweredCount === 0) return;

          // Answered correctly
          const answered: BaselineResponseInput[] = Array.from({ length: answeredCount }, () => ({
            clo_id: cloId,
            selected_option: 1,
            correct_option: 1,
          }));

          // Unanswered (wrong answer — simulates time expiry where answer doesn't match)
          const unanswered: BaselineResponseInput[] = Array.from({ length: unansweredCount }, () => ({
            clo_id: cloId,
            selected_option: 0,
            correct_option: 2, // deliberately wrong
          }));

          const allResponses = [...answered, ...unanswered];
          const results = calculateBaselineScores(allResponses);
          const result = results.find((r) => r.clo_id === cloId);

          expect(result).toBeDefined();
          expect(result!.correct_count).toBe(answeredCount);
          expect(result!.question_count).toBe(answeredCount + unansweredCount);
          expect(result!.score).toBe(
            Math.round((answeredCount / (answeredCount + unansweredCount)) * 100),
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
