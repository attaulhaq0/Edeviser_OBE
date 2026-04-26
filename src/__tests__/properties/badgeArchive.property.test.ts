// Feature: xp-marketplace, Property 37: archived badge exclusion from spotlight
// **Validates: Requirements 35.1, 35.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveBadgeSpotlight,
  type BadgeDefinition,
} from '@/lib/badgeSpotlightResolver';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const badgeDefArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  is_archived: fc.boolean(),
});

const badgeListArb = fc.array(badgeDefArb, { minLength: 0, maxLength: 20 });
const studentIdArb = fc.uuid();
const weekNumberArb = fc.integer({ min: 1, max: 52 });

// ─── Property 37: Archived badges excluded from spotlight ───────────────────

describe('Property 37 — Archived badge exclusion from spotlight and checks', () => {
  it('P37a: archived badges never appear as spotlight selection', () => {
    fc.assert(
      fc.property(studentIdArb, weekNumberArb, badgeListArb, (studentId, weekNumber, badges) => {
        const result = resolveBadgeSpotlight({ studentId, weekNumber, availableBadges: badges });
        if (result.spotlightBadgeId) {
          const selected = badges.find((b) => b.id === result.spotlightBadgeId);
          expect(selected).toBeDefined();
          expect(selected!.is_archived).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P37b: when all badges are archived, spotlight returns null', () => {
    fc.assert(
      fc.property(
        studentIdArb,
        weekNumberArb,
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            is_archived: fc.constant(true),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (studentId, weekNumber, archivedBadges) => {
          const result = resolveBadgeSpotlight({
            studentId,
            weekNumber,
            availableBadges: archivedBadges,
          });
          expect(result.spotlightBadgeId).toBeNull();
          expect(result.spotlightBadgeName).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P37c: unarchiving a badge makes it eligible for spotlight again', () => {
    fc.assert(
      fc.property(studentIdArb, weekNumberArb, (studentId, weekNumber) => {
        const badge: BadgeDefinition = { id: 'test-badge', name: 'Test', is_archived: false };

        // With only one non-archived badge, it must be selected
        const result = resolveBadgeSpotlight({
          studentId,
          weekNumber,
          availableBadges: [badge],
        });
        expect(result.spotlightBadgeId).toBe('test-badge');

        // Archive it — now null
        const archivedResult = resolveBadgeSpotlight({
          studentId,
          weekNumber,
          availableBadges: [{ ...badge, is_archived: true }],
        });
        expect(archivedResult.spotlightBadgeId).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('P37d: archived badges are filtered before rotation index calculation', () => {
    fc.assert(
      fc.property(studentIdArb, weekNumberArb, badgeListArb, (studentId, weekNumber, badges) => {
        const eligible = badges.filter((b) => !b.is_archived);
        const result = resolveBadgeSpotlight({ studentId, weekNumber, availableBadges: badges });

        if (eligible.length === 0) {
          expect(result.spotlightBadgeId).toBeNull();
        } else {
          expect(result.rotationIndex).toBeGreaterThanOrEqual(0);
          expect(result.rotationIndex).toBeLessThan(eligible.length);
        }
      }),
      { numRuns: 100 },
    );
  });
});
