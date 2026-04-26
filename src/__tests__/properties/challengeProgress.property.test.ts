// =============================================================================
// Property Tests: Challenge Progress — Task 9.5
// Feature: team-challenges, Properties P10, P11, P12
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChallengeType = 'academic' | 'habit' | 'xp_race' | 'blooms_climb' | 'cooperative';

interface ChallengeConfig {
  type: ChallengeType;
  goalTarget: number;
}

interface ProgressState {
  currentProgress: number;
  completedAt: string | null;
  rewardGranted: boolean;
}

// ─── Pure logic under test ───────────────────────────────────────────────────

/**
 * Compute progress for a given challenge type.
 *
 * - academic: count of graded assignments
 * - habit: streak days
 * - xp_race: total XP earned
 * - blooms_climb: distinct Bloom's levels achieved (0-6)
 * - cooperative: collective team progress (sum of all member contributions)
 */
function computeProgress(
  type: ChallengeType,
  events: { gradedAssignments?: number; streakDays?: number; totalXp?: number; bloomLevels?: Set<number>; memberContributions?: number[] },
): number {
  switch (type) {
    case 'academic':
      return events.gradedAssignments ?? 0;
    case 'habit':
      return events.streakDays ?? 0;
    case 'xp_race':
      return events.totalXp ?? 0;
    case 'blooms_climb': {
      const levels = events.bloomLevels ?? new Set<number>();
      // Bloom's levels are 0-6 (Remember through Create + base)
      return Math.min(levels.size, 6);
    }
    case 'cooperative':
      return (events.memberContributions ?? []).reduce((sum, c) => sum + c, 0);
  }
}

/**
 * Check if challenge is completed and trigger reward.
 * Returns updated progress state.
 */
function processProgressUpdate(
  config: ChallengeConfig,
  currentState: ProgressState,
  newProgress: number,
  rewardXp: number,
): { state: ProgressState; rewardTriggered: boolean; rewardAmount: number } {
  // If already completed, no further updates
  if (currentState.completedAt !== null) {
    return { state: currentState, rewardTriggered: false, rewardAmount: 0 };
  }

  const updatedProgress = Math.max(currentState.currentProgress, newProgress);
  const isComplete = updatedProgress >= config.goalTarget;

  if (isComplete && !currentState.rewardGranted) {
    return {
      state: {
        currentProgress: updatedProgress,
        completedAt: new Date().toISOString(),
        rewardGranted: true,
      },
      rewardTriggered: true,
      rewardAmount: rewardXp,
    };
  }

  return {
    state: {
      ...currentState,
      currentProgress: updatedProgress,
    },
    rewardTriggered: false,
    rewardAmount: 0,
  };
}

/**
 * Process an event idempotently. Same event processed twice should not
 * double-count progress.
 */
function processEventIdempotent(
  processedEventIds: Set<string>,
  eventId: string,
  progressIncrement: number,
): { newProgress: number; alreadyProcessed: boolean } {
  if (processedEventIds.has(eventId)) {
    return { newProgress: 0, alreadyProcessed: true };
  }
  processedEventIds.add(eventId);
  return { newProgress: progressIncrement, alreadyProcessed: false };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P10: Progress by type', () => {
  // Feature: team-challenges, Property 10: Progress computation by challenge type

  it('academic: progress = count of graded assignments', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        (gradedCount) => {
          const progress = computeProgress('academic', { gradedAssignments: gradedCount });
          expect(progress).toBe(gradedCount);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('habit: progress = streak days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 90 }),
        (streakDays) => {
          const progress = computeProgress('habit', { streakDays });
          expect(progress).toBe(streakDays);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('xp_race: progress = total XP earned', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (totalXp) => {
          const progress = computeProgress('xp_race', { totalXp });
          expect(progress).toBe(totalXp);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('blooms_climb: progress = distinct Bloom levels, capped at 6', () => {
    fc.assert(
      fc.property(
        fc.subarray([0, 1, 2, 3, 4, 5, 6]),
        (levels) => {
          const bloomLevels = new Set(levels);
          const progress = computeProgress('blooms_climb', { bloomLevels });
          expect(progress).toBe(Math.min(bloomLevels.size, 6));
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(6);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('cooperative: progress = sum of all member contributions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5000 }), { minLength: 2, maxLength: 6 }),
        (memberContributions) => {
          const progress = computeProgress('cooperative', { memberContributions });
          const expectedSum = memberContributions.reduce((a, b) => a + b, 0);
          expect(progress).toBe(expectedSum);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('progress is always non-negative for all types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ChallengeType>('academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative'),
        (type) => {
          const progress = computeProgress(type, {
            gradedAssignments: 0,
            streakDays: 0,
            totalXp: 0,
            bloomLevels: new Set(),
            memberContributions: [],
          });
          expect(progress).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property P11: Completion triggers reward when progress >= goal_target', () => {
  // Feature: team-challenges, Property 11: Completion triggers reward

  it('reward is triggered when progress reaches goal_target', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ChallengeType>('academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative'),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 50, max: 500 }),
        (type, goalTarget, rewardXp) => {
          const config: ChallengeConfig = { type, goalTarget };
          const initialState: ProgressState = {
            currentProgress: 0,
            completedAt: null,
            rewardGranted: false,
          };

          const result = processProgressUpdate(config, initialState, goalTarget, rewardXp);

          expect(result.rewardTriggered).toBe(true);
          expect(result.rewardAmount).toBe(rewardXp);
          expect(result.state.completedAt).not.toBeNull();
          expect(result.state.rewardGranted).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('reward is triggered when progress exceeds goal_target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 50, max: 500 }),
        (goalTarget, excess, rewardXp) => {
          const config: ChallengeConfig = { type: 'academic', goalTarget };
          const initialState: ProgressState = {
            currentProgress: 0,
            completedAt: null,
            rewardGranted: false,
          };

          const result = processProgressUpdate(config, initialState, goalTarget + excess, rewardXp);

          expect(result.rewardTriggered).toBe(true);
          expect(result.state.currentProgress).toBe(goalTarget + excess);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('no reward when progress is below goal_target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        fc.integer({ min: 50, max: 500 }),
        (goalTarget, rewardXp) => {
          const config: ChallengeConfig = { type: 'academic', goalTarget };
          const initialState: ProgressState = {
            currentProgress: 0,
            completedAt: null,
            rewardGranted: false,
          };

          const result = processProgressUpdate(config, initialState, goalTarget - 1, rewardXp);

          expect(result.rewardTriggered).toBe(false);
          expect(result.rewardAmount).toBe(0);
          expect(result.state.completedAt).toBeNull();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('already-completed challenge does not trigger reward again', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 50, max: 500 }),
        (goalTarget, rewardXp) => {
          const config: ChallengeConfig = { type: 'academic', goalTarget };
          const completedState: ProgressState = {
            currentProgress: goalTarget,
            completedAt: '2025-01-01T00:00:00Z',
            rewardGranted: true,
          };

          const result = processProgressUpdate(config, completedState, goalTarget + 10, rewardXp);

          expect(result.rewardTriggered).toBe(false);
          expect(result.rewardAmount).toBe(0);
          expect(result.state).toBe(completedState); // unchanged
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P12: Idempotence — processing same event twice does not double-count', () => {
  // Feature: team-challenges, Property 12: Event processing idempotence

  it('same event ID processed twice yields progress increment only once', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 100 }),
        (eventId, increment) => {
          const processedIds = new Set<string>();

          const first = processEventIdempotent(processedIds, eventId, increment);
          const second = processEventIdempotent(processedIds, eventId, increment);

          expect(first.alreadyProcessed).toBe(false);
          expect(first.newProgress).toBe(increment);
          expect(second.alreadyProcessed).toBe(true);
          expect(second.newProgress).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('different event IDs are each counted once', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 50 }),
        (eventIds, increment) => {
          const uniqueIds = [...new Set(eventIds)];
          const processedIds = new Set<string>();
          let totalProgress = 0;

          for (const eventId of uniqueIds) {
            const result = processEventIdempotent(processedIds, eventId, increment);
            totalProgress += result.newProgress;
          }

          expect(totalProgress).toBe(uniqueIds.length * increment);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('reprocessing all events does not change total progress', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 50 }),
        (eventIds, increment) => {
          const uniqueIds = [...new Set(eventIds)];
          const processedIds = new Set<string>();
          let totalProgress = 0;

          // First pass
          for (const eventId of uniqueIds) {
            const result = processEventIdempotent(processedIds, eventId, increment);
            totalProgress += result.newProgress;
          }

          const progressAfterFirst = totalProgress;

          // Second pass (reprocess all)
          for (const eventId of uniqueIds) {
            const result = processEventIdempotent(processedIds, eventId, increment);
            totalProgress += result.newProgress;
          }

          expect(totalProgress).toBe(progressAfterFirst);
        },
      ),
      { numRuns: 200 },
    );
  });
});
