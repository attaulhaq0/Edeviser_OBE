// Task 139.3: Comeback Kid badge logic — pure function for testability
// Awards "Comeback Kid" badge when student earns 3+ Improvement Bonuses in a single semester
// Idempotent: cannot be awarded twice for same semester

export const COMEBACK_KID_THRESHOLD = 3;
export const COMEBACK_KID_BADGE_ID = 'comeback_kid';

export interface ComebackKidInput {
  existingBadgeIds: Set<string>;
  improvementBonusCount: number;
}

/**
 * Determines whether the Comeback Kid badge should be awarded.
 * Returns the badge ID if eligible, or an empty array if not.
 *
 * Requirements 123.4:
 * - Award "Comeback Kid" badge when student earns 3 Improvement Bonuses within a single semester
 * - Idempotent: cannot be awarded twice for same semester
 */
export function shouldAwardComebackKid(input: ComebackKidInput): string[] {
  if (input.existingBadgeIds.has(COMEBACK_KID_BADGE_ID)) {
    return [];
  }

  if (input.improvementBonusCount >= COMEBACK_KID_THRESHOLD) {
    return [COMEBACK_KID_BADGE_ID];
  }

  return [];
}
