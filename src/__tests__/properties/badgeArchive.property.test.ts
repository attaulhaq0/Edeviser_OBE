// =============================================================================
// Property-Based Test: Badge Archive
// Task 25.10 — P37: archived badge exclusion from spotlight
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveBadgeSpotlight } from '@/lib/badgeSpotlightResolver';

/**
 * **Validates: Requirements 134.4**
 * P37: Archived badges are never selected for the spotlight.
 */
describe('P37: Archived badge exclusion from spotlight', () => {
  it('archived badges are never selected regardless of student or week', () => {
    const archivedBadgeId = 'archived-badge-1';

    const badges = [
      { id: 'active-1', name: 'Active Badge 1', isArchived: false },
      { id: 'active-2', name: 'Active Badge 2', isArchived: false },
      { id: archivedBadgeId, name: 'Archived Badge', isArchived: true },
      { id: 'active-3', name: 'Active Badge 3', isArchived: false },
    ];

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 52 }),
        (studentId, weekNumber) => {
          const result = resolveBadgeSpotlight(studentId, weekNumber, badges);
          expect(result.badgeId).not.toBe(archivedBadgeId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null when all badges are archived', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 52 }),
        (studentId, weekNumber) => {
          const allArchived = [
            { id: 'a1', name: 'A1', isArchived: true },
            { id: 'a2', name: 'A2', isArchived: true },
          ];
          const result = resolveBadgeSpotlight(studentId, weekNumber, allArchived);
          expect(result.badgeId).toBeNull();
          expect(result.badgeName).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('gold-earned badges are excluded from spotlight', () => {
    const badges = [
      { id: 'b1', name: 'Badge 1', isArchived: false },
      { id: 'b2', name: 'Badge 2', isArchived: false },
      { id: 'b3', name: 'Badge 3', isArchived: false },
    ];

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 52 }),
        (studentId, weekNumber) => {
          // All badges are gold-earned
          const result = resolveBadgeSpotlight(studentId, weekNumber, badges, ['b1', 'b2', 'b3']);
          expect(result.badgeId).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
