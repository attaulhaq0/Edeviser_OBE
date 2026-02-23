import { STREAK_MILESTONES } from '@/lib/streakCalculator';

/**
 * Get the next milestone target from the STREAK_MILESTONES array.
 * Returns null if the student has passed all milestones.
 */
export function getNextMilestone(streakCount: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (streakCount < milestone) return milestone;
  }
  return null;
}

/**
 * Calculate progress percentage toward the next milestone.
 * Progress is measured from the previous milestone (or 0) to the next.
 */
export function getMilestoneProgress(streakCount: number): number {
  const next = getNextMilestone(streakCount);
  if (next === null) return 100;

  const milestones: number[] = [...STREAK_MILESTONES];
  const nextIndex = milestones.indexOf(next);
  const prev = nextIndex > 0 ? (milestones[nextIndex - 1] ?? 0) : 0;
  const range = next - prev;
  if (range === 0) return 100;

  return Math.round(((streakCount - prev) / range) * 100);
}
