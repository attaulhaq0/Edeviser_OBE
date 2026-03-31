import { describe, it, expect } from 'vitest';
import {
  shouldAwardComebackKid,
  COMEBACK_KID_THRESHOLD,
  COMEBACK_KID_BADGE_ID,
} from '@/lib/comebackKidChecker';

describe('Comeback Kid Badge Logic (Task 139.3)', () => {
  it('awards badge when improvement bonus count reaches threshold (3)', () => {
    const result = shouldAwardComebackKid({
      existingBadgeIds: new Set(),
      improvementBonusCount: COMEBACK_KID_THRESHOLD,
    });
    expect(result).toEqual([COMEBACK_KID_BADGE_ID]);
  });

  it('awards badge when improvement bonus count exceeds threshold', () => {
    const result = shouldAwardComebackKid({
      existingBadgeIds: new Set(),
      improvementBonusCount: 5,
    });
    expect(result).toEqual([COMEBACK_KID_BADGE_ID]);
  });

  it('does not award badge when count is below threshold', () => {
    const result = shouldAwardComebackKid({
      existingBadgeIds: new Set(),
      improvementBonusCount: 2,
    });
    expect(result).toEqual([]);
  });

  it('does not award badge when count is zero', () => {
    const result = shouldAwardComebackKid({
      existingBadgeIds: new Set(),
      improvementBonusCount: 0,
    });
    expect(result).toEqual([]);
  });

  it('is idempotent — does not award if badge already exists', () => {
    const result = shouldAwardComebackKid({
      existingBadgeIds: new Set([COMEBACK_KID_BADGE_ID]),
      improvementBonusCount: 5,
    });
    expect(result).toEqual([]);
  });

  it('ignores other existing badges when checking idempotency', () => {
    const result = shouldAwardComebackKid({
      existingBadgeIds: new Set(['streak_7', 'first_submission']),
      improvementBonusCount: 3,
    });
    expect(result).toEqual([COMEBACK_KID_BADGE_ID]);
  });

  it('threshold constant is 3', () => {
    expect(COMEBACK_KID_THRESHOLD).toBe(3);
  });
});
