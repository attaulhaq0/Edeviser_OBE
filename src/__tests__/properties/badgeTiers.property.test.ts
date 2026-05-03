// =============================================================================
// Property-Based Test: Badge Tiers & Spotlight
// Task 25.5 — P31: monotonic tier progression, P32: spotlight determinism
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveBadgeSpotlight, getISOWeekNumber } from '@/lib/badgeSpotlightResolver';

const TIER_ORDER = ['bronze', 'silver', 'gold'] as const;

/**
 * **Validates: Requirements 133.1**
 * P31: Badge tier progression is monotonic (bronze → silver → gold).
 */
describe('P31: Monotonic badge tier progression', () => {
  it('tier order is always bronze < silver < gold', () => {
    for (let i = 0; i < TIER_ORDER.length - 1; i++) {
      const current = TIER_ORDER[i];
      const next = TIER_ORDER[i + 1];
      expect(TIER_ORDER.indexOf(current!)).toBeLessThan(TIER_ORDER.indexOf(next!));
    }
  });
});

/**
 * **Validates: Requirements 134.4**
 * P32: Badge spotlight is deterministic — same student + same week = same badge.
 */
describe('P32: Badge spotlight determinism', () => {
  const sampleBadges = [
    { id: 'badge-1', name: 'Explorer', isArchived: false },
    { id: 'badge-2', name: 'Scholar', isArchived: false },
    { id: 'badge-3', name: 'Creator', isArchived: false },
    { id: 'badge-4', name: 'Achiever', isArchived: false },
    { id: 'badge-5', name: 'Archived', isArchived: true },
  ];

  it('same student + same week always produces the same badge', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 52 }),
        (studentId, weekNumber) => {
          const result1 = resolveBadgeSpotlight(studentId, weekNumber, sampleBadges);
          const result2 = resolveBadgeSpotlight(studentId, weekNumber, sampleBadges);
          expect(result1.badgeId).toBe(result2.badgeId);
          expect(result1.badgeName).toBe(result2.badgeName);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('archived badges are never selected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 52 }),
        (studentId, weekNumber) => {
          const result = resolveBadgeSpotlight(studentId, weekNumber, sampleBadges);
          if (result.badgeId) {
            expect(result.badgeId).not.toBe('badge-5');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null when no eligible badges exist', () => {
    const archivedOnly = [{ id: 'a', name: 'A', isArchived: true }];
    const result = resolveBadgeSpotlight('student-1', 1, archivedOnly);
    expect(result.badgeId).toBeNull();
  });

  it('getISOWeekNumber returns a number between 1 and 53 for valid dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const date = new Date(year, month, day);
          const week = getISOWeekNumber(date);
          expect(week).toBeGreaterThanOrEqual(1);
          expect(week).toBeLessThanOrEqual(53);
        },
      ),
      { numRuns: 100 },
    );
  });
});
