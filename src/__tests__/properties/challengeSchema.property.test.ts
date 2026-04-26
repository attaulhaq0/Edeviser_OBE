// =============================================================================
// Property Tests: Challenge Schema Validation — Task 9.4
// Feature: team-challenges, Property P8 (date constraint validation)
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidGoalTarget, wouldExceedConcurrentLimit, type ChallengeTypeId } from '@/lib/challengeTypes';

// ─── Pure validation logic ───────────────────────────────────────────────────

interface ChallengeValidation {
  startDate: Date;
  endDate: Date;
  rewardXp: number;
  challengeType: ChallengeTypeId;
  goalTarget: number;
  xpRaceAcknowledged?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateChallenge(input: ChallengeValidation): ValidationResult {
  const errors: string[] = [];

  // End date must be after start date
  if (input.endDate <= input.startDate) {
    errors.push('End date must be after start date');
  }

  // Minimum 24 hours
  const durationMs = input.endDate.getTime() - input.startDate.getTime();
  if (durationMs < 24 * 60 * 60 * 1000) {
    errors.push('Challenge must be at least 24 hours long');
  }

  // Maximum 90 days
  if (durationMs > 90 * 24 * 60 * 60 * 1000) {
    errors.push('Challenge cannot exceed 90 days');
  }

  // Reward XP bounds
  if (input.rewardXp < 50 || input.rewardXp > 500) {
    errors.push('Reward XP must be between 50 and 500');
  }

  // Goal target validation
  if (!isValidGoalTarget(input.challengeType, input.goalTarget)) {
    errors.push('Invalid goal target for challenge type');
  }

  // XP Race acknowledgment
  if (input.challengeType === 'xp_race' && !input.xpRaceAcknowledged) {
    errors.push('XP Race challenges require explicit acknowledgment');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P8: Challenge date constraint validation', () => {
  it('rejects challenges where end date is before or equal to start date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') }),
        fc.integer({ min: 0, max: 86400000 }), // zero to 24h offset (will be subtracted)
        (startDate, offsetMs) => {
          // Ensure valid date
          fc.pre(!isNaN(startDate.getTime()));
          const endDate = new Date(startDate.getTime() - offsetMs); // end before or at start
          const result = validateChallenge({
            startDate,
            endDate,
            rewardXp: 100,
            challengeType: 'academic',
            goalTarget: 5,
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('after start date') || e.includes('24 hours'))).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects challenges shorter than 24 hours', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') }),
        fc.integer({ min: 1, max: 86399999 }), // 1ms to just under 24h
        (startDate, offsetMs) => {
          fc.pre(!isNaN(startDate.getTime()));
          const endDate = new Date(startDate.getTime() + offsetMs);
          const result = validateChallenge({
            startDate,
            endDate,
            rewardXp: 100,
            challengeType: 'academic',
            goalTarget: 5,
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('24 hours'))).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects challenges longer than 90 days', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-06-01') }),
        fc.integer({ min: 91, max: 365 }), // 91-365 days
        (startDate, durationDays) => {
          fc.pre(!isNaN(startDate.getTime()));
          const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
          const result = validateChallenge({
            startDate,
            endDate,
            rewardXp: 100,
            challengeType: 'academic',
            goalTarget: 5,
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('90 days'))).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('accepts challenges between 1 and 90 days', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-06-01') }),
        fc.integer({ min: 1, max: 90 }), // 1-90 days
        (startDate, durationDays) => {
          fc.pre(!isNaN(startDate.getTime()));
          const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
          const result = validateChallenge({
            startDate,
            endDate,
            rewardXp: 100,
            challengeType: 'academic',
            goalTarget: 5,
          });
          // Should not have date-related errors
          expect(result.errors.filter((e) => e.includes('date') || e.includes('hours') || e.includes('days'))).toHaveLength(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('XP Race requires acknowledgment', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-06-01') }),
        fc.integer({ min: 100, max: 10000 }),
        (startDate, goalTarget) => {
          fc.pre(!isNaN(startDate.getTime()));
          const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          const result = validateChallenge({
            startDate,
            endDate,
            rewardXp: 100,
            challengeType: 'xp_race',
            goalTarget,
            xpRaceAcknowledged: false,
          });
          expect(result.errors.some((e) => e.includes('acknowledgment'))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Blooms Climb goal target is always 6', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (target) => {
          const valid = isValidGoalTarget('blooms_climb', target);
          expect(valid).toBe(target === 6);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('concurrent limit check works correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ChallengeTypeId>('academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative'),
        fc.integer({ min: 0, max: 20 }),
        (typeId, currentCount) => {
          const exceeds = wouldExceedConcurrentLimit(typeId, currentCount);
          if (typeId === 'xp_race') {
            expect(exceeds).toBe(currentCount >= 2);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
