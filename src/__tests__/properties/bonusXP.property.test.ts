// Feature: adaptive-quiz-generation, Property 19: Hard question bonus XP capped at 50
// **Validates: Requirements 13.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeBonusXP } from '@/lib/questionAnalytics';

const questionArb = fc.record({
  difficulty_rating: fc.double({ min: 1.0, max: 5.0, noNaN: true }),
});

describe('computeBonusXP — property-based tests', () => {
  it('P19a: bonus XP equals 10 × hard questions, capped at 50', () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 0, maxLength: 30 }),
        (questions) => {
          const result = computeBonusXP(questions);
          const hardCount = questions.filter((q) => q.difficulty_rating >= 4.0).length;
          const expected = Math.min(hardCount * 10, 50);
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19b: result never exceeds 50', () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 0, maxLength: 50 }),
        (questions) => {
          expect(computeBonusXP(questions)).toBeLessThanOrEqual(50);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19c: result is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 0, maxLength: 30 }),
        (questions) => {
          expect(computeBonusXP(questions)).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19g: result is always a multiple of 10', () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 0, maxLength: 30 }),
        (questions) => {
          expect(computeBonusXP(questions) % 10).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19d: no hard questions produces 0 XP', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ difficulty_rating: fc.double({ min: 1.0, max: 3.99, noNaN: true }) }),
          { minLength: 0, maxLength: 20 },
        ),
        (questions) => {
          expect(computeBonusXP(questions)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19e: exactly 5 hard questions produces max 50 XP', () => {
    const fiveHard = Array.from({ length: 5 }, () => ({ difficulty_rating: 4.5 }));
    expect(computeBonusXP(fiveHard)).toBe(50);
  });

  it('P19f: 6+ hard questions still capped at 50 XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 30 }),
        (count) => {
          const questions = Array.from({ length: count }, () => ({ difficulty_rating: 4.5 }));
          expect(computeBonusXP(questions)).toBe(50);
        },
      ),
      { numRuns: 100 },
    );
  });
});
