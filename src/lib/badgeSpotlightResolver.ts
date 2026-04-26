/**
 * Pure function for deterministic badge spotlight rotation.
 *
 * Different students see different badges spotlighted each week.
 * Uses student_id hash + ISO week number to deterministically select a badge.
 * Archived badges are excluded from spotlight rotation.
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  is_archived: boolean;
  tier_conditions?: Record<string, unknown>;
}

export interface BadgeSpotlightInput {
  studentId: string;
  weekNumber: number;
  availableBadges: readonly BadgeDefinition[];
}

export interface BadgeSpotlightResult {
  spotlightBadgeId: string | null;
  spotlightBadgeName: string | null;
  rotationIndex: number;
}

/**
 * Simple string hash function (djb2 algorithm).
 * Produces a consistent positive integer from a string.
 */
const hashString = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const resolveBadgeSpotlight = (input: BadgeSpotlightInput): BadgeSpotlightResult => {
  const { studentId, weekNumber, availableBadges } = input;

  // Filter out archived badges
  const eligibleBadges = availableBadges.filter((b) => !b.is_archived);

  if (eligibleBadges.length === 0) {
    return { spotlightBadgeId: null, spotlightBadgeName: null, rotationIndex: 0 };
  }

  // Deterministic selection: hash(studentId + weekNumber) mod eligible count
  const seed = `${studentId}-week-${weekNumber}`;
  const hash = hashString(seed);
  const rotationIndex = hash % eligibleBadges.length;

  const selected = eligibleBadges[rotationIndex]!;

  return {
    spotlightBadgeId: selected.id,
    spotlightBadgeName: selected.name,
    rotationIndex,
  };
};

/**
 * Get the ISO week number for a given date.
 */
export const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};
