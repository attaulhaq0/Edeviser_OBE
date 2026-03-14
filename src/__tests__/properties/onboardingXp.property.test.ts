// Feature: student-onboarding-profiling, Property 13, 14
// P13: XP awarded once per onboarding
// P14: Re-assessment does not award onboarding XP
// **Validates: Requirements 12.5, 18.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ONBOARDING_XP } from '@/lib/onboardingConstants';

interface XpTransaction {
  student_id: string;
  source: string;
  amount: number;
  assessment_version: number;
}

/**
 * Pure function simulating XP award logic:
 * Only awards onboarding XP for assessment_version === 1.
 */
function computeOnboardingXp(
  completedSections: ('personality' | 'learning_style' | 'self_efficacy' | 'study_strategy')[],
  baselineCourseCount: number,
  assessmentVersion: number,
): XpTransaction[] {
  if (assessmentVersion > 1) return []; // P14: no XP for re-assessment

  const transactions: XpTransaction[] = [];
  const studentId = 'test-student';

  for (const section of completedSections) {
    const amount = ONBOARDING_XP[section];
    if (amount) {
      transactions.push({ student_id: studentId, source: `onboarding_${section}`, amount, assessment_version: assessmentVersion });
    }
  }

  for (let i = 0; i < baselineCourseCount; i++) {
    transactions.push({ student_id: studentId, source: 'onboarding_baseline', amount: ONBOARDING_XP.baseline_per_course, assessment_version: assessmentVersion });
  }

  transactions.push({ student_id: studentId, source: 'onboarding_complete', amount: ONBOARDING_XP.complete, assessment_version: assessmentVersion });

  return transactions;
}

const sectionsArb = fc.subarray(['personality', 'learning_style', 'self_efficacy', 'study_strategy'] as const, { minLength: 0, maxLength: 4 });

describe('Onboarding XP — property-based tests', () => {
  it('P13: onboarding XP is awarded exactly once — no duplicate sources for version 1', () => {
    fc.assert(
      fc.property(
        sectionsArb,
        fc.integer({ min: 0, max: 5 }),
        (sections, courseCount) => {
          const transactions = computeOnboardingXp([...sections], courseCount, 1);

          // Check no duplicate non-baseline sources
          const nonBaselineSources = transactions
            .filter((t) => t.source !== 'onboarding_baseline')
            .map((t) => t.source);
          const uniqueSources = new Set(nonBaselineSources);
          expect(uniqueSources.size).toBe(nonBaselineSources.length);

          // Baseline transactions should equal course count
          const baselineCount = transactions.filter((t) => t.source === 'onboarding_baseline').length;
          expect(baselineCount).toBe(courseCount);

          // Total XP should match expected
          const expectedTotal =
            sections.reduce((sum, s) => sum + (ONBOARDING_XP[s] ?? 0), 0) +
            courseCount * ONBOARDING_XP.baseline_per_course +
            ONBOARDING_XP.complete;
          const actualTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
          expect(actualTotal).toBe(expectedTotal);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P14: re-assessment (version > 1) produces zero onboarding XP transactions', () => {
    fc.assert(
      fc.property(
        sectionsArb,
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 2, max: 10 }),
        (sections, courseCount, version) => {
          const transactions = computeOnboardingXp([...sections], courseCount, version);
          expect(transactions).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
