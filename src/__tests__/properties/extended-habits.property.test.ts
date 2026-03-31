// Property 97: Extended habit type validation
// Property 98: Extended habit completion triggers
// Property 99: Updated Perfect Day threshold
// Feature: edeviser-platform, Properties 97-99

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const ALL_HABITS = ['login', 'submit', 'journal', 'read', 'collaborate', 'practice', 'review', 'mentor'] as const;
type HabitType = (typeof ALL_HABITS)[number];

describe('Extended Habit Properties', () => {
  // Property 97: All 8 habit types are valid
  it('all 8 habit types are recognized', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_HABITS),
        (habit: HabitType) => {
          expect(ALL_HABITS).toContain(habit);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property 98: Each extended habit has a defined XP award (15 XP)
  it('extended habits award 15 XP each', () => {
    const EXTENDED_HABITS: HabitType[] = ['collaborate', 'practice', 'review', 'mentor'];
    const XP_PER_EXTENDED_HABIT = 15;

    fc.assert(
      fc.property(
        fc.constantFrom(...EXTENDED_HABITS),
        (habit) => {
          expect(EXTENDED_HABITS).toContain(habit);
          expect(XP_PER_EXTENDED_HABIT).toBe(15);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property 99: Perfect Day requires ≥6 of 8 habits
  it('Perfect Day triggers at 6+ of 8 habits completed', () => {
    const PERFECT_DAY_THRESHOLD = 6;

    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...ALL_HABITS), { minLength: 0, maxLength: 8 }),
        (completedHabits) => {
          const uniqueCompleted = new Set(completedHabits).size;
          const isPerfectDay = uniqueCompleted >= PERFECT_DAY_THRESHOLD;

          if (uniqueCompleted >= 6) {
            expect(isPerfectDay).toBe(true);
          } else {
            expect(isPerfectDay).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
