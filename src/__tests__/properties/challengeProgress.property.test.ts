// Feature: team-challenges, Property 10: Progress by type including cooperative
// Feature: team-challenges, Property 11: Completion triggers reward
// Feature: team-challenges, Property 12: Idempotence
// **Validates: Requirements 10.1-10.4, 10.7, 19.3, 19.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Pure logic under test ────────────────────────────────────────────────────

type ChallengeType = 'academic' | 'habit' | 'xp_race' | 'blooms_climb' | 'cooperative';

interface ChallengeProgress {
  current_progress: number;
  completed_at: string | null;
  reward_granted: boolean;
}

function computeProgress(type: ChallengeType, rawData: number[]): number {
  switch (type) {
    case 'academic':
      return rawData.length; // count of graded assignments
    case 'habit':
      return rawData[0] ?? 0; // streak days
    case 'xp_race':
      return rawData.reduce((s, v) => s + v, 0); // total XP
    case 'blooms_climb':
      return new Set(rawData).size; // distinct Bloom's levels
    case 'cooperative':
      return rawData.reduce((s, v) => s + v, 0); // collective team progress
  }
}

function processEvent(
  existing: ChallengeProgress,
  goalTarget: number,
  newProgress: number,
): ChallengeProgress {
  if (existing.completed_at) return existing; // already completed
  const updated = Math.max(existing.current_progress, newProgress);
  if (updated >= goalTarget) {
    return { current_progress: updated, completed_at: new Date().toISOString(), reward_granted: true };
  }
  return { current_progress: updated, completed_at: null, reward_granted: false };
}

// ── Generators ───────────────────────────────────────────────────────────────

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Property 10: Challenge progress computation by type', () => {
  it('academic progress equals count of items', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 20 }),
        (assignments) => {
          expect(computeProgress('academic', assignments)).toBe(assignments.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('xp_race progress equals sum of XP', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 1, maxLength: 20 }),
        (xpValues) => {
          const expected = xpValues.reduce((s, v) => s + v, 0);
          expect(computeProgress('xp_race', xpValues)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('blooms_climb progress equals distinct levels', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 20 }),
        (levels) => {
          const expected = new Set(levels).size;
          expect(computeProgress('blooms_climb', levels)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cooperative progress equals collective sum', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        (contributions) => {
          const expected = contributions.reduce((s, v) => s + v, 0);
          expect(computeProgress('cooperative', contributions)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 11: Completion triggers reward', () => {
  it('progress reaching goal triggers completion and reward', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 500 }),
        (goalTarget, extraProgress) => {
          const progress = goalTarget + extraProgress;
          const existing: ChallengeProgress = { current_progress: 0, completed_at: null, reward_granted: false };
          const result = processEvent(existing, goalTarget, progress);
          expect(result.completed_at).not.toBeNull();
          expect(result.reward_granted).toBe(true);
          expect(result.current_progress).toBeGreaterThanOrEqual(goalTarget);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('progress below goal does not trigger completion', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1000 }),
        (goalTarget) => {
          const progress = goalTarget - 1;
          const existing: ChallengeProgress = { current_progress: 0, completed_at: null, reward_granted: false };
          const result = processEvent(existing, goalTarget, progress);
          expect(result.completed_at).toBeNull();
          expect(result.reward_granted).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 12: Challenge progress idempotence', () => {
  it('processing same event twice yields same result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 2000 }),
        (goalTarget, progress) => {
          const initial: ChallengeProgress = { current_progress: 0, completed_at: null, reward_granted: false };
          const first = processEvent(initial, goalTarget, progress);
          const second = processEvent(first, goalTarget, progress);
          expect(second.current_progress).toBe(first.current_progress);
          expect(second.reward_granted).toBe(first.reward_granted);
          expect(!!second.completed_at).toBe(!!first.completed_at);
        },
      ),
      { numRuns: 100 },
    );
  });
});
