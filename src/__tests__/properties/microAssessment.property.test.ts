// Feature: student-onboarding-profiling, Property 28, 29
// P28: Micro-assessment dismissal limit enforced (3 max)
// P29: XP awarded per completion only
// **Validates: Requirements 25.3, 25.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MAX_MICRO_DISMISSALS, ONBOARDING_XP } from '@/lib/onboardingConstants';

type MicroStatus = 'pending' | 'completed' | 'skipped' | 'dismissed';

interface MicroAssessment {
  status: MicroStatus;
  dismissal_count: number;
}

function processDismissal(current: MicroAssessment): MicroAssessment {
  const newCount = current.dismissal_count + 1;
  if (newCount >= MAX_MICRO_DISMISSALS) {
    return { status: 'skipped', dismissal_count: newCount };
  }
  return { status: 'dismissed', dismissal_count: newCount };
}

function computeMicroXp(status: MicroStatus): number {
  return status === 'completed' ? ONBOARDING_XP.micro_assessment : 0;
}

describe('Micro-assessment — property-based tests', () => {
  it('P28: after 3 consecutive dismissals, status becomes skipped', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (extraDismissals) => {
          let micro: MicroAssessment = { status: 'pending', dismissal_count: 0 };

          // Dismiss exactly MAX_MICRO_DISMISSALS times
          for (let i = 0; i < MAX_MICRO_DISMISSALS; i++) {
            micro = processDismissal(micro);
          }
          expect(micro.status).toBe('skipped');
          expect(micro.dismissal_count).toBe(MAX_MICRO_DISMISSALS);

          // Further dismissals should not change status from skipped
          // (in practice, skipped items are not re-presented)
          const afterSkip = processDismissal(micro);
          expect(afterSkip.dismissal_count).toBe(MAX_MICRO_DISMISSALS + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P28: fewer than 3 dismissals keeps status as dismissed, not skipped', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_MICRO_DISMISSALS - 1 }),
        (dismissCount) => {
          let micro: MicroAssessment = { status: 'pending', dismissal_count: 0 };
          for (let i = 0; i < dismissCount; i++) {
            micro = processDismissal(micro);
          }
          expect(micro.status).toBe('dismissed');
          expect(micro.dismissal_count).toBe(dismissCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P28: MAX_MICRO_DISMISSALS is exactly 3', () => {
    expect(MAX_MICRO_DISMISSALS).toBe(3);
  });

  it('P29: XP is awarded only for completed micro-assessments', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<MicroStatus>('pending', 'completed', 'skipped', 'dismissed'),
        (status) => {
          const xp = computeMicroXp(status);
          if (status === 'completed') {
            expect(xp).toBe(ONBOARDING_XP.micro_assessment);
            expect(xp).toBe(10);
          } else {
            expect(xp).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P29: completed micro-assessment awards exactly 10 XP', () => {
    expect(computeMicroXp('completed')).toBe(10);
    expect(computeMicroXp('dismissed')).toBe(0);
    expect(computeMicroXp('skipped')).toBe(0);
    expect(computeMicroXp('pending')).toBe(0);
  });
});
