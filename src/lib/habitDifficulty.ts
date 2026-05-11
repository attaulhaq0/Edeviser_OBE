// Task 145.3: Habit Difficulty Level utility

/**
 * Returns the number of habits required for the given difficulty level.
 * Level 1: 1 habit (login only)
 * Level 2: 2 habits (login + one other)
 * Level 3: 6 of 8 habits
 */
export function getRequiredHabitsForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level === 2) return 2;
  return 6;
}

/**
 * Check if a student should be promoted to the next level.
 * Promotion occurs when habit_level_streak >= 7 and level < 3.
 */
export function checkLevelPromotion(
  level: number,
  habitLevelStreak: number
): boolean {
  return habitLevelStreak >= 7 && level < 3;
}

/**
 * Returns the Perfect Day threshold for the given difficulty level.
 * Level 1: 1 habit
 * Level 2: 2 habits
 * Level 3: 6 of 8 habits
 */
export function getPerfectDayThreshold(level: number): number {
  return getRequiredHabitsForLevel(level);
}
