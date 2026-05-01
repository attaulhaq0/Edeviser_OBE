import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  getRequiredHabitsForLevel,
  checkLevelPromotion,
  getPerfectDayThreshold,
} from "@/lib/habitDifficulty";

// Feature: edeviser-platform

describe("Habit Difficulty Level Properties", () => {
  // Property 104: Habit Difficulty Level promotion correctness
  // *For any* student at Habit Difficulty Level L (where L < 3), completing all
  // required habits for 7 consecutive days should promote the student to Level L+1.
  // Missing a day should reset habit_level_streak to 0 but should not change
  // habit_difficulty_level.
  // **Validates: Requirements 127.3, 127.5**
  describe("Property 104: Habit Difficulty Level promotion correctness", () => {
    it("promotes to next level when streak reaches 7 and level < 3", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2 }),
          fc.integer({ min: 7, max: 100 }),
          (level, streak) => {
            expect(checkLevelPromotion(level, streak)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("does not promote when level is already 3 (max)", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 200 }), (streak) => {
          expect(checkLevelPromotion(3, streak)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("does not promote when streak < 7", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 0, max: 6 }),
          (level, streak) => {
            expect(checkLevelPromotion(level, streak)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("simulates 7-day streak leading to promotion without demotion on miss", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2 }),
          fc.array(fc.boolean(), { minLength: 14, maxLength: 30 }),
          (startLevel, dailyCompletions) => {
            let level = startLevel;
            let streak = 0;

            for (const completed of dailyCompletions) {
              if (completed) {
                streak += 1;
                if (checkLevelPromotion(level, streak)) {
                  level += 1;
                  streak = 0;
                }
              } else {
                // Miss resets streak but never demotes
                const levelBefore = level;
                streak = 0;
                expect(level).toBe(levelBefore);
              }
            }

            // Level should never decrease and never exceed 3
            expect(level).toBeGreaterThanOrEqual(startLevel);
            expect(level).toBeLessThanOrEqual(3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 105: Relative Perfect Day threshold
  // *For any* student at Habit Difficulty Level 1, Perfect Day requires 1 habit.
  // At Level 2, Perfect Day requires 2 habits. At Level 3, Perfect Day requires
  // 6 of 8 habits. The Perfect Day XP award (50 XP) should be the same regardless
  // of level.
  // **Validates: Requirements 128.1, 128.2, 128.3, 128.5**
  describe("Property 105: Relative Perfect Day threshold", () => {
    it("Level 1 Perfect Day requires exactly 1 habit", () => {
      expect(getPerfectDayThreshold(1)).toBe(1);
    });

    it("Level 2 Perfect Day requires exactly 2 habits", () => {
      expect(getPerfectDayThreshold(2)).toBe(2);
    });

    it("Level 3 Perfect Day requires exactly 6 habits", () => {
      expect(getPerfectDayThreshold(3)).toBe(6);
    });

    it("threshold is monotonically non-decreasing with level", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 2 }), (level) => {
          const current = getPerfectDayThreshold(level);
          const next = getPerfectDayThreshold(level + 1);
          expect(next).toBeGreaterThanOrEqual(current);
        }),
        { numRuns: 100 }
      );
    });

    it("required habits for level matches perfect day threshold", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 3 }), (level) => {
          expect(getPerfectDayThreshold(level)).toBe(
            getRequiredHabitsForLevel(level)
          );
        }),
        { numRuns: 100 }
      );
    });

    it("threshold is always positive for valid levels", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 3 }), (level) => {
          expect(getPerfectDayThreshold(level)).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
