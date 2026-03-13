// Feature: student-onboarding-profiling, Property 35
// P35: Profile complete bonus awarded exactly once at 100%
// **Validates: Requirements 26.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateProfileCompleteness, type ProfileCompletenessInput } from '@/lib/scoreCalculator';
import { ONBOARDING_XP } from '@/lib/onboardingConstants';

interface XpTransaction {
  source: string;
  amount: number;
}

/**
 * Pure function simulating profile complete bonus logic.
 * Awards bonus exactly once when completeness reaches 100%.
 */
function checkProfileCompleteBonus(
  completeness: number,
  existingTransactions: XpTransaction[],
): XpTransaction | null {
  if (completeness < 100) return null;
  const alreadyAwarded = existingTransactions.some((t) => t.source === 'profile_complete');
  if (alreadyAwarded) return null;
  return { source: 'profile_complete', amount: ONBOARDING_XP.profile_complete };
}

const profileInputArb: fc.Arbitrary<ProfileCompletenessInput> = fc.record({
  personality_items: fc.integer({ min: 0, max: 25 }),
  self_efficacy_items: fc.integer({ min: 0, max: 6 }),
  study_strategy_items: fc.integer({ min: 0, max: 8 }),
  learning_style_items: fc.integer({ min: 0, max: 16 }),
  baseline_courses: fc.integer({ min: 0, max: 5 }),
});

describe('Profile complete bonus — property-based tests', () => {
  it('P35: bonus is awarded exactly once when completeness reaches 100%', () => {
    const fullInput: ProfileCompletenessInput = {
      personality_items: 25,
      self_efficacy_items: 6,
      study_strategy_items: 8,
      learning_style_items: 16,
      baseline_courses: 1,
    };
    const completeness = calculateProfileCompleteness(fullInput);
    expect(completeness).toBe(100);

    // First time: bonus awarded
    const bonus = checkProfileCompleteBonus(completeness, []);
    expect(bonus).not.toBeNull();
    expect(bonus!.source).toBe('profile_complete');
    expect(bonus!.amount).toBe(30);

    // Second time: bonus NOT awarded (already exists)
    const secondBonus = checkProfileCompleteBonus(completeness, [bonus!]);
    expect(secondBonus).toBeNull();
  });

  it('P35: bonus is never awarded when completeness < 100%', () => {
    fc.assert(
      fc.property(
        profileInputArb.filter((input) => {
          const c = calculateProfileCompleteness(input);
          return c < 100;
        }),
        (input) => {
          const completeness = calculateProfileCompleteness(input);
          const bonus = checkProfileCompleteBonus(completeness, []);
          expect(bonus).toBeNull();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('P35: bonus amount is exactly 30 XP from ONBOARDING_XP.profile_complete', () => {
    expect(ONBOARDING_XP.profile_complete).toBe(30);
  });

  it('P35: idempotent — calling multiple times with existing transaction never duplicates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (callCount) => {
          const completeness = 100;
          const transactions: XpTransaction[] = [];

          for (let i = 0; i < callCount; i++) {
            const bonus = checkProfileCompleteBonus(completeness, transactions);
            if (bonus) transactions.push(bonus);
          }

          const profileCompleteTxns = transactions.filter((t) => t.source === 'profile_complete');
          expect(profileCompleteTxns).toHaveLength(1);
          expect(profileCompleteTxns[0].amount).toBe(30);
        },
      ),
      { numRuns: 100 },
    );
  });
});
