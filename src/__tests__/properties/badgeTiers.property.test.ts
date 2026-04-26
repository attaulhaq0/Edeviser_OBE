// Feature: xp-marketplace, Property 31: monotonic tier progression
// Feature: xp-marketplace, Property 32: spotlight determinism
// **Validates: Requirements 33.2, 33.3, 33.4, 34.2, 34.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveBadgeSpotlight,
  type BadgeDefinition,
} from '@/lib/badgeSpotlightResolver';

// ─── Pure tier progression logic ────────────────────────────────────────────

type BadgeTier = 'bronze' | 'silver' | 'gold';
const TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold'];

function tierRank(tier: BadgeTier | null): number {
  if (tier === null) return -1;
  return TIER_ORDER.indexOf(tier);
}

function canProgressTo(current: BadgeTier | null, next: BadgeTier): boolean {
  if (current === null) return next === 'bronze';
  if (current === 'bronze') return next === 'silver';
  if (current === 'silver') return next === 'gold';
  return false; // gold cannot progress further
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const tierArb = fc.constantFrom(null, 'bronze', 'silver', 'gold') as fc.Arbitrary<BadgeTier | null>;
const nextTierArb = fc.constantFrom('bronze', 'silver', 'gold') as fc.Arbitrary<BadgeTier>;

const badgeDefArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  is_archived: fc.boolean(),
});

const badgeListArb = fc.array(badgeDefArb, { minLength: 1, maxLength: 20 });
const studentIdArb = fc.uuid();
const weekNumberArb = fc.integer({ min: 1, max: 52 });

// ─── Property 31: Badge tier progression is monotonic ───────────────────────

describe('Property 31 — Badge tier progression is monotonic', () => {
  it('P31a: valid progression only goes forward: null → bronze → silver → gold', () => {
    fc.assert(
      fc.property(tierArb, nextTierArb, (current, next) => {
        const valid = canProgressTo(current, next);
        if (valid) {
          expect(tierRank(next)).toBeGreaterThan(tierRank(current));
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P31b: cannot skip tiers — bronze must come before silver, silver before gold', () => {
    fc.assert(
      fc.property(tierArb, (current) => {
        if (current === null) {
          expect(canProgressTo(current, 'silver')).toBe(false);
          expect(canProgressTo(current, 'gold')).toBe(false);
          expect(canProgressTo(current, 'bronze')).toBe(true);
        }
        if (current === 'bronze') {
          expect(canProgressTo(current, 'gold')).toBe(false);
          expect(canProgressTo(current, 'silver')).toBe(true);
        }
        if (current === 'gold') {
          expect(canProgressTo(current, 'bronze')).toBe(false);
          expect(canProgressTo(current, 'silver')).toBe(false);
          expect(canProgressTo(current, 'gold')).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 32: Badge spotlight deterministic rotation ────────────────────

describe('Property 32 — Badge spotlight deterministic rotation', () => {
  it('P32a: same student + same week = same badge (deterministic)', () => {
    fc.assert(
      fc.property(studentIdArb, weekNumberArb, badgeListArb, (studentId, weekNumber, badges) => {
        const eligible = badges.filter((b) => !b.is_archived);
        if (eligible.length === 0) return;

        const result1 = resolveBadgeSpotlight({ studentId, weekNumber, availableBadges: badges });
        const result2 = resolveBadgeSpotlight({ studentId, weekNumber, availableBadges: badges });
        expect(result1.spotlightBadgeId).toBe(result2.spotlightBadgeId);
      }),
      { numRuns: 100 },
    );
  });

  it('P32b: spotlight selects from non-archived badges only', () => {
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

  it('P32c: returns null when all badges are archived', () => {
    fc.assert(
      fc.property(studentIdArb, weekNumberArb, (studentId, weekNumber) => {
        const allArchived: BadgeDefinition[] = [
          { id: 'a', name: 'Badge A', is_archived: true },
          { id: 'b', name: 'Badge B', is_archived: true },
        ];
        const result = resolveBadgeSpotlight({ studentId, weekNumber, availableBadges: allArchived });
        expect(result.spotlightBadgeId).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('P32d: different students likely see different badges (with enough badges)', () => {
    const badges: BadgeDefinition[] = Array.from({ length: 10 }, (_, i) => ({
      id: `badge-${i}`,
      name: `Badge ${i}`,
      is_archived: false,
    }));
    const weekNumber = 10;
    const spotlights = new Set<string | null>();
    // Generate 20 different student IDs
    for (let i = 0; i < 20; i++) {
      const studentId = `student-${i}-${Math.random().toString(36).slice(2)}`;
      const result = resolveBadgeSpotlight({ studentId, weekNumber, availableBadges: badges });
      spotlights.add(result.spotlightBadgeId);
    }
    // With 10 badges and 20 students, we expect at least 2 different spotlights
    expect(spotlights.size).toBeGreaterThan(1);
  });
});
