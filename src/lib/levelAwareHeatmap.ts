import type { LevelProgressionPoint } from '@/types/habits';

/**
 * Returns the max number of academic habits expected per day for a given level.
 * Level 1 → 1, Level 2 → 2, Level 3 → 3, Level 4 → 4.
 */
export const getLevelMaxHabits = (level: 1 | 2 | 3 | 4): number => level;

/**
 * Computes heatmap cell intensity relative to the student's level max.
 * Returns 0–4 intensity level.
 *
 * - count=0 or levelMax=0 → 0
 * - ratio ≤ 0.25 → 1
 * - ratio ≤ 0.5  → 2
 * - ratio ≤ 0.75 → 3
 * - ratio > 0.75 → 4
 */
export const getLevelAwareIntensityLevel = (
  count: number,
  levelMax: number,
): number => {
  if (count === 0 || levelMax === 0) return 0;
  const ratio = count / levelMax;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
};

/**
 * Finds the student's habit difficulty level on a given date by scanning
 * the level history (sorted by date ascending). Returns the most recent
 * level change on or before the given date. Defaults to level 4 if no
 * history entry precedes the date.
 */
export const getLevelForDate = (
  date: string,
  history: LevelProgressionPoint[],
): 1 | 2 | 3 | 4 => {
  let level: 1 | 2 | 3 | 4 = 4;
  for (const point of history) {
    if (point.date <= date) {
      level = point.level;
    }
  }
  return level;
};

/**
 * Computes a level-relative consistency score:
 * - Excludes sabbatical dates from both numerator and denominator
 * - A day is "fully completed" when academicCount >= the level active on that date
 * - Returns 0–100 (percentage)
 * - Returns 0 when all days are sabbatical days
 */
export const computeLevelRelativeConsistencyScore = (
  days: Array<{ date: string; academicCount: number }>,
  levelHistory: LevelProgressionPoint[],
  sabbaticalDates: Set<string>,
): number => {
  const eligibleDays = days.filter((d) => !sabbaticalDates.has(d.date));
  if (eligibleDays.length === 0) return 0;

  const fullyCompletedDays = eligibleDays.filter((d) => {
    const levelOnDate = getLevelForDate(d.date, levelHistory);
    return d.academicCount >= levelOnDate;
  }).length;

  return Math.round((fullyCompletedDays / eligibleDays.length) * 100);
};
