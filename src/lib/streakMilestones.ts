import type { HeatmapDay, StreakMilestone } from '@/types/habits';

const MILESTONES = [7, 14, 30, 60, 100] as const;

/**
 * Returns the next milestone threshold above the current streak count,
 * or null if all milestones have been reached.
 */
export function getNextMilestone(streakCount: number): number | null {
  for (const m of MILESTONES) {
    if (streakCount < m) return m;
  }
  return null;
}

/**
 * Returns the percentage progress (0–100) toward the next milestone.
 * If all milestones are reached, returns 100.
 */
export function getMilestoneProgress(streakCount: number): number {
  if (streakCount <= 0) return 0;

  let prevMilestone = 0;
  for (const m of MILESTONES) {
    if (streakCount < m) {
      const rangeSize = m - prevMilestone;
      const progressInRange = streakCount - prevMilestone;
      return Math.round((progressInRange / rangeSize) * 100);
    }
    prevMilestone = m;
  }

  return 100;
}

/**
 * Detects streak milestones (30, 60, 100 consecutive active days) from
 * a sorted array of HeatmapDay objects. A day is considered "active" when
 * its academicCount > 0. Returns milestones in the order they were achieved.
 */
export function detectStreakMilestones(days: HeatmapDay[]): StreakMilestone[] {
  const milestoneThresholds = [30, 60, 100] as const;
  const milestones: StreakMilestone[] = [];
  let consecutiveDays = 0;

  for (const day of days) {
    if (day.academicCount > 0) {
      consecutiveDays++;
      for (const threshold of milestoneThresholds) {
        if (consecutiveDays === threshold) {
          milestones.push({ days: threshold, achievedDate: day.date });
        }
      }
    } else {
      consecutiveDays = 0;
    }
  }

  return milestones;
}
