// Feature: adaptive-quiz-generation, Property 9: Selected question respects difficulty range
// **Validates: Requirements 6.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface QuestionCandidate {
  id: string;
  difficulty_rating: number;
}

/**
 * Simulates the adaptive question selection: picks a question
 * within ±0.5 of the target difficulty from the pool.
 * Returns null if no question is within range.
 */
function selectQuestion(
  pool: QuestionCandidate[],
  targetDifficulty: number,
  range = 0.5,
): QuestionCandidate | null {
  const eligible = pool.filter(
    (q) => Math.abs(q.difficulty_rating - targetDifficulty) <= range,
  );
  if (eligible.length === 0) return null;
  // Pick the closest to target
  eligible.sort(
    (a, b) =>
      Math.abs(a.difficulty_rating - targetDifficulty) -
      Math.abs(b.difficulty_rating - targetDifficulty),
  );
  return eligible[0] ?? null;
}

const questionPoolArb = fc.array(
  fc.record({
    id: fc.uuid(),
    difficulty_rating: fc.double({ min: 1.0, max: 5.0, noNaN: true }),
  }),
  { minLength: 1, maxLength: 20 },
);

describe('Question selection — property-based tests', () => {
  it('P9: selected question is always within ±0.5 of target difficulty', () => {
    fc.assert(
      fc.property(
        questionPoolArb,
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        (pool, targetDifficulty) => {
          const selected = selectQuestion(pool, targetDifficulty);
          if (selected === null) {
            // Verify no question was within range
            const anyInRange = pool.some(
              (q) => Math.abs(q.difficulty_rating - targetDifficulty) <= 0.5,
            );
            expect(anyInRange).toBe(false);
          } else {
            expect(Math.abs(selected.difficulty_rating - targetDifficulty)).toBeLessThanOrEqual(0.5);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
