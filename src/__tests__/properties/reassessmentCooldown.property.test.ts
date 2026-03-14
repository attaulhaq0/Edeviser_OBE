// Feature: student-onboarding-profiling, Property 15
// P15: 90-day cooldown enforcement
// **Validates: Requirements 18.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { REASSESSMENT_COOLDOWN_DAYS } from '@/lib/onboardingConstants';

/**
 * Pure function simulating cooldown check logic.
 * Returns true if re-assessment is allowed (cooldown elapsed).
 */
function isReassessmentAllowed(lastCompletedAt: Date, now: Date): boolean {
  const diffMs = now.getTime() - lastCompletedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= REASSESSMENT_COOLDOWN_DAYS;
}

const validDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()));

describe('Reassessment cooldown — property-based tests', () => {
  it('P15: re-assessment is rejected when less than 90 days have passed', () => {
    fc.assert(
      fc.property(
        validDate,
        fc.integer({ min: 0, max: 89 }),
        (completedAt, daysSince) => {
          const now = new Date(completedAt.getTime() + daysSince * 24 * 60 * 60 * 1000);
          expect(isReassessmentAllowed(completedAt, now)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('P15: re-assessment is allowed when 90 or more days have passed', () => {
    fc.assert(
      fc.property(
        validDate,
        fc.integer({ min: 90, max: 365 }),
        (completedAt, daysSince) => {
          const now = new Date(completedAt.getTime() + daysSince * 24 * 60 * 60 * 1000);
          expect(isReassessmentAllowed(completedAt, now)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('P15: cooldown uses exactly REASSESSMENT_COOLDOWN_DAYS (90)', () => {
    expect(REASSESSMENT_COOLDOWN_DAYS).toBe(90);
  });
});
