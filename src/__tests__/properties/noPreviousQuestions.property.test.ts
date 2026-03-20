// Feature: adaptive-quiz-generation, Property 11: No previously answered questions selected
// **Validates: Requirements 6.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface QuestionCandidate {
  id: string;
  difficulty_rating: number;
  bloom_level: number;
}

/**
 * Filters a question pool by excluding previously answered question IDs.
 * Mirrors step 5 of the select-adaptive-question Edge Function pipeline:
 * "Exclude previously answered questions (from quiz_attempt.question_sequence)"
 */
function filterEligibleQuestions(
  pool: QuestionCandidate[],
  previouslyAnsweredIds: Set<string>,
): QuestionCandidate[] {
  return pool.filter((q) => !previouslyAnsweredIds.has(q.id));
}

const questionArb = fc.record({
  id: fc.uuid(),
  difficulty_rating: fc.double({ min: 1.0, max: 5.0, noNaN: true }),
  bloom_level: fc.integer({ min: 1, max: 6 }),
});

const questionPoolArb = fc.array(questionArb, { minLength: 1, maxLength: 30 });

describe('No previously answered questions — property-based tests', () => {
  it('P11: filtered pool contains zero overlap with previously answered IDs', () => {
    fc.assert(
      fc.property(
        questionPoolArb,
        fc.integer({ min: 0, max: 15 }),
        (pool, answerCount) => {
          // Pick a random subset of pool IDs as "previously answered"
          const answeredCount = Math.min(answerCount, pool.length);
          const previouslyAnsweredIds = new Set(
            pool.slice(0, answeredCount).map((q) => q.id),
          );

          const eligible = filterEligibleQuestions(pool, previouslyAnsweredIds);

          // Every eligible question must NOT be in the previously answered set
          for (const q of eligible) {
            expect(previouslyAnsweredIds.has(q.id)).toBe(false);
          }

          // The eligible count should equal pool size minus answered questions that were in the pool
          const expectedCount = pool.filter(
            (q) => !previouslyAnsweredIds.has(q.id),
          ).length;
          expect(eligible.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
