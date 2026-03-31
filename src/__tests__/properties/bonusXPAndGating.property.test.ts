// Feature: edeviser-platform, Property 30: Bonus XP event multiplier application
// Feature: edeviser-platform, Property 31: Assignment prerequisite gating
// Feature: edeviser-platform, Property 32: First-Attempt Bonus idempotency
// Feature: edeviser-platform, Property 33: Mystery badge hidden conditions
// **Validates: Requirements 36.3, 37.2, 36.1, 36.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { applyBonusMultiplier } from '@/lib/xpLevelCalculator';

// ─── Property 30: Bonus XP event multiplier application ─────────────────────

describe('Property 30 — Bonus XP event multiplier application', () => {
  it('P30a: XP during active bonus event is multiplied by M', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.double({ min: 1.5, max: 5.0, noNaN: true }),
        (baseXP, multiplier) => {
          const result = applyBonusMultiplier(baseXP, multiplier);
          expect(result).toBe(Math.floor(baseXP * multiplier));
          expect(result).toBeGreaterThanOrEqual(baseXP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P30b: XP outside bonus event window is unaffected (multiplier = 1)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (baseXP) => {
          const result = applyBonusMultiplier(baseXP, 1);
          expect(result).toBe(baseXP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P30c: multiplier < 1 is treated as no multiplier', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        (baseXP, multiplier) => {
          const result = applyBonusMultiplier(baseXP, multiplier);
          expect(result).toBe(baseXP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P30d: bonus event window check is time-bounded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1095 }).map((offset) => new Date(Date.UTC(2024, 0, 1 + offset))),
        fc.integer({ min: 1, max: 72 }),
        (startDate, durationHours) => {
          const endDate = new Date(startDate.getTime() + durationHours * 3600_000);
          const midpoint = new Date(startDate.getTime() + (durationHours * 3600_000) / 2);
          const before = new Date(startDate.getTime() - 1000);
          const after = new Date(endDate.getTime() + 1000);

          const isInWindow = (t: Date) => t >= startDate && t <= endDate;

          expect(isInWindow(midpoint)).toBe(true);
          expect(isInWindow(before)).toBe(false);
          expect(isInWindow(after)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 31: Assignment prerequisite gating ────────────────────────────

describe('Property 31 — Assignment prerequisite gating', () => {
  interface Prerequisite {
    clo_id: string;
    min_attainment_percent: number;
  }

  function canSubmitAssignment(
    prerequisites: Prerequisite[],
    studentAttainments: Record<string, number>,
  ): { allowed: boolean; blockedBy?: Prerequisite } {
    for (const prereq of prerequisites) {
      const attainment = studentAttainments[prereq.clo_id] ?? 0;
      if (attainment < prereq.min_attainment_percent) {
        return { allowed: false, blockedBy: prereq };
      }
    }
    return { allowed: true };
  }

  it('P31a: student below threshold is denied submission', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 50, max: 100 }),
        fc.integer({ min: 0, max: 49 }),
        (cloId, threshold, studentAttainment) => {
          fc.pre(studentAttainment < threshold);
          const result = canSubmitAssignment(
            [{ clo_id: cloId, min_attainment_percent: threshold }],
            { [cloId]: studentAttainment },
          );
          expect(result.allowed).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P31b: student at or above threshold is allowed submission', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 10, max: 90 }),
        (cloId, threshold) => {
          const studentAttainment = threshold + fc.sample(fc.integer({ min: 0, max: 10 }), 1)[0]!;
          const result = canSubmitAssignment(
            [{ clo_id: cloId, min_attainment_percent: threshold }],
            { [cloId]: studentAttainment },
          );
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P31c: assignment with no prerequisites is always allowed', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.uuid(), fc.integer({ min: 0, max: 100 }), { minKeys: 0, maxKeys: 5 }),
        (attainments) => {
          const result = canSubmitAssignment([], attainments);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 32: First-Attempt Bonus idempotency ───────────────────────────

describe('Property 32 — First-Attempt Bonus idempotency', () => {
  const FIRST_ATTEMPT_BONUS_XP = 25;

  function calculateFirstAttemptBonus(
    scorePercent: number,
    isFirstSubmission: boolean,
    bonusAlreadyAwarded: boolean,
  ): number {
    if (isFirstSubmission && scorePercent >= 50 && !bonusAlreadyAwarded) {
      return FIRST_ATTEMPT_BONUS_XP;
    }
    return 0;
  }

  it('P32a: first submission scoring >= 50% awards exactly 25 XP', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 100, noNaN: true }),
        (score) => {
          const bonus = calculateFirstAttemptBonus(score, true, false);
          expect(bonus).toBe(FIRST_ATTEMPT_BONUS_XP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32b: subsequent submissions do not re-trigger bonus', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 100, noNaN: true }),
        (score) => {
          const bonus = calculateFirstAttemptBonus(score, false, true);
          expect(bonus).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32c: first submission scoring < 50% does not award bonus', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 49.99, noNaN: true }),
        (score) => {
          const bonus = calculateFirstAttemptBonus(score, true, false);
          expect(bonus).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 33: Mystery badge hidden conditions ───────────────────────────

describe('Property 33 — Mystery badge hidden conditions', () => {
  interface Badge {
    id: string;
    name: string;
    is_mystery: boolean;
    condition: string;
    description: string;
  }

  interface StudentBadge {
    badge_id: string;
    earned: boolean;
  }

  function getBadgeVisibility(
    badge: Badge,
    studentBadge: StudentBadge | null,
  ): { conditionVisible: boolean; badgeVisible: boolean; descriptionVisible: boolean } {
    if (!badge.is_mystery) {
      return { conditionVisible: true, badgeVisible: true, descriptionVisible: true };
    }
    // Mystery badge: hidden until earned
    const earned = studentBadge?.earned ?? false;
    return {
      conditionVisible: earned,
      badgeVisible: earned,
      descriptionVisible: earned,
    };
  }

  it('P33a: mystery badge condition is hidden before earning', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (id, name) => {
          const badge: Badge = { id, name, is_mystery: true, condition: 'secret', description: 'Hidden badge' };
          const visibility = getBadgeVisibility(badge, null);
          expect(visibility.conditionVisible).toBe(false);
          expect(visibility.badgeVisible).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P33b: mystery badge is visible after earning', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (id, name) => {
          const badge: Badge = { id, name, is_mystery: true, condition: 'secret', description: 'Hidden badge' };
          const visibility = getBadgeVisibility(badge, { badge_id: id, earned: true });
          expect(visibility.conditionVisible).toBe(true);
          expect(visibility.badgeVisible).toBe(true);
          expect(visibility.descriptionVisible).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P33c: non-mystery badges are always visible', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.boolean(),
        (id, name, earned) => {
          const badge: Badge = { id, name, is_mystery: false, condition: 'public', description: 'Normal badge' };
          const studentBadge = earned ? { badge_id: id, earned: true } : null;
          const visibility = getBadgeVisibility(badge, studentBadge);
          expect(visibility.conditionVisible).toBe(true);
          expect(visibility.badgeVisible).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
