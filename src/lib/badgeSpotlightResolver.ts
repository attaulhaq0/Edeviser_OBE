// =============================================================================
// Badge Spotlight Resolver — Pure function
// Deterministic badge rotation from student_id hash + week number
// Different students see different badges in the same week
// =============================================================================

export interface BadgeDefinition {
  id: string;
  name: string;
  isArchived: boolean;
}

export interface SpotlightResult {
  /** The selected badge definition ID, or null if no eligible badges */
  badgeId: string | null;
  /** The selected badge name, or null if no eligible badges */
  badgeName: string | null;
  /** The week number used for the computation */
  weekNumber: number;
}

/**
 * Simple string hash function (djb2 variant).
 * Produces a non-negative 32-bit integer from a string.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + char
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  // Ensure non-negative
  return Math.abs(hash);
}

/**
 * Compute the current ISO week number for a given date.
 * ISO weeks start on Monday; week 1 contains the first Thursday of the year.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}

/**
 * Resolve the badge spotlight for a given student and week.
 *
 * The selection is deterministic: same student + same week = same badge.
 * Different students will (with high probability) see different badges.
 *
 * Only non-archived badges are eligible. If a set of earned gold-tier badge IDs
 * is provided, those are also excluded (student has fully completed them).
 *
 * @param studentId - The student's UUID
 * @param weekNumber - The ISO week number (or any consistent week identifier)
 * @param badges - All badge definitions for the institution
 * @param earnedGoldBadgeIds - Badge IDs where the student has earned gold tier (optional)
 */
export function resolveBadgeSpotlight(
  studentId: string,
  weekNumber: number,
  badges: BadgeDefinition[],
  earnedGoldBadgeIds: string[] = [],
): SpotlightResult {
  // Filter to eligible badges: not archived, not fully earned (gold)
  const goldSet = new Set(earnedGoldBadgeIds);
  const eligible = badges.filter(
    (b) => !b.isArchived && !goldSet.has(b.id),
  );

  if (eligible.length === 0) {
    return { badgeId: null, badgeName: null, weekNumber };
  }

  // Sort eligible badges by ID for deterministic ordering
  const sorted = [...eligible].sort((a, b) => a.id.localeCompare(b.id));

  // Deterministic index from hash of studentId + weekNumber
  const hashInput = `${studentId}:${weekNumber}`;
  const hash = hashString(hashInput);
  const index = hash % sorted.length;

  const selected = sorted[index] ?? sorted[0];
  if (!selected) {
    return { badgeId: null, badgeName: null, weekNumber };
  }

  return {
    badgeId: selected.id,
    badgeName: selected.name,
    weekNumber,
  };
}
