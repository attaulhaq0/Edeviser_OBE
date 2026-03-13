// Feature: student-onboarding-profiling, Property 18, 19
// P18: min questions per CLO for baseline activation
// P19: time limit [5, 60]
// **Validates: Requirements 9.2, 9.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { baselineTestConfigSchema } from '@/lib/onboardingSchemas';

const MIN_QUESTIONS_PER_CLO = 2;

/**
 * Pure function simulating baseline test activation validation.
 * Returns true if activation is allowed (all CLOs have >= 2 questions).
 */
function canActivateBaseline(
  questionCountsByClo: Record<string, number>,
): boolean {
  const cloIds = Object.keys(questionCountsByClo);
  if (cloIds.length === 0) return false;
  return cloIds.every((cloId) => (questionCountsByClo[cloId] ?? 0) >= MIN_QUESTIONS_PER_CLO);
}

describe('Baseline config — property-based tests', () => {
  it('P18: activation is rejected when any CLO has fewer than 2 questions', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.uuid(), fc.integer({ min: 0, max: 1 }), { minKeys: 1, maxKeys: 5 }),
        (questionCounts) => {
          // Ensure at least one CLO has < 2 questions
          const hasInsufficient = Object.values(questionCounts).some((c) => c < MIN_QUESTIONS_PER_CLO);
          if (hasInsufficient) {
            expect(canActivateBaseline(questionCounts)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P18: activation is allowed when all CLOs have >= 2 questions', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.uuid(), fc.integer({ min: 2, max: 20 }), { minKeys: 1, maxKeys: 5 }),
        (questionCounts) => {
          expect(canActivateBaseline(questionCounts)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19: baselineTestConfigSchema accepts time_limit_minutes in [5, 60]', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 5, max: 60 }),
        (courseId, timeLimit) => {
          const result = baselineTestConfigSchema.safeParse({
            course_id: courseId,
            time_limit_minutes: timeLimit,
            is_active: true,
          });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19: baselineTestConfigSchema rejects time_limit_minutes outside [5, 60]', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: -100, max: 100 }).filter((n) => n < 5 || n > 60),
        (courseId, timeLimit) => {
          const result = baselineTestConfigSchema.safeParse({
            course_id: courseId,
            time_limit_minutes: timeLimit,
            is_active: true,
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
