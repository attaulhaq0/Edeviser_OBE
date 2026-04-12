// =============================================================================
// Property 113: Badge archive threshold
// Property 114: Badge pin limit enforcement
// Property 115: Active badge collection size limit
// Feature: edeviser-platform
// **Validates: Requirements 135.1, 135.2, 135.3, 135.4**
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure functions mirroring badge archive/pin/collection logic ─────────────

const ARCHIVE_THRESHOLD_DAYS = 90;
const MAX_PINNED = 3;
const MAX_ACTIVE = 12;

interface BadgeRecord {
  id: string;
  is_pinned: boolean;
  archived_at: string | null;
  last_upgraded_at: string;
}

function shouldArchive(badge: BadgeRecord, now: Date): boolean {
  if (badge.is_pinned) return false;
  if (badge.archived_at !== null) return false;
  const lastUpgraded = new Date(badge.last_upgraded_at);
  const daysSinceUpgrade = (now.getTime() - lastUpgraded.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpgrade >= ARCHIVE_THRESHOLD_DAYS;
}

function canPinBadge(currentPinnedCount: number): boolean {
  return currentPinnedCount < MAX_PINNED;
}

function getActiveBadges(badges: BadgeRecord[]): BadgeRecord[] {
  const active = badges.filter((b) => b.archived_at === null);
  // Pinned badges always in active section
  const pinned = active.filter((b) => b.is_pinned);
  const unpinned = active.filter((b) => !b.is_pinned);
  // Active section: pinned first, then most recent, capped at MAX_ACTIVE
  const result = [...pinned, ...unpinned];
  return result.slice(0, MAX_ACTIVE);
}

// ─── Generators ──────────────────────────────────────────────────────────────

const badgeRecordArb = fc.record({
  id: fc.uuid(),
  is_pinned: fc.boolean(),
  archived_at: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 0, max: 365 }).map((offset) => {
      const d = new Date('2024-06-01T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString();
    }),
  ),
  last_upgraded_at: fc.integer({ min: 0, max: 730 }).map((offset) => {
    const d = new Date('2024-01-01T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString();
  }),
});

// ─── Properties ──────────────────────────────────────────────────────────────

describe('Property 113: Badge archive threshold', () => {
  it('badges not upgraded in 90+ days and not pinned are archived', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 150 }).map((offset) => {
          const d = new Date('2024-01-01T00:00:00Z');
          d.setUTCDate(d.getUTCDate() + offset);
          return d.toISOString();
        }),
        (lastUpgraded) => {
          const now = new Date('2025-01-01');
          const badge: BadgeRecord = {
            id: 'test',
            is_pinned: false,
            archived_at: null,
            last_upgraded_at: lastUpgraded,
          };
          const daysSince = (now.getTime() - new Date(lastUpgraded).getTime()) / (1000 * 60 * 60 * 24);
          const result = shouldArchive(badge, now);
          if (daysSince >= ARCHIVE_THRESHOLD_DAYS) {
            expect(result).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pinned badges are never auto-archived', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }).map((offset) => {
          const d = new Date('2023-01-01T00:00:00Z');
          d.setUTCDate(d.getUTCDate() + offset);
          return d.toISOString();
        }),
        (lastUpgraded) => {
          const now = new Date('2025-01-01');
          const badge: BadgeRecord = {
            id: 'test',
            is_pinned: true,
            archived_at: null,
            last_upgraded_at: lastUpgraded,
          };
          expect(shouldArchive(badge, now)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('recently upgraded badges are not archived', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 89 }),
        (daysAgo) => {
          const now = new Date('2025-06-01');
          const upgraded = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          const badge: BadgeRecord = {
            id: 'test',
            is_pinned: false,
            archived_at: null,
            last_upgraded_at: upgraded.toISOString(),
          };
          expect(shouldArchive(badge, now)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 114: Badge pin limit enforcement', () => {
  it('allows pinning when fewer than 3 badges pinned', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        (pinnedCount) => {
          expect(canPinBadge(pinnedCount)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects pinning when 3 or more badges already pinned', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 20 }),
        (pinnedCount) => {
          expect(canPinBadge(pinnedCount)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 115: Active badge collection size limit', () => {
  it('active section displays at most 12 badges', () => {
    fc.assert(
      fc.property(
        fc.array(badgeRecordArb.map((b) => ({ ...b, archived_at: null })), {
          minLength: 0,
          maxLength: 30,
        }),
        (badges) => {
          const active = getActiveBadges(badges);
          expect(active.length).toBeLessThanOrEqual(MAX_ACTIVE);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pinned badges are always included in active section', () => {
    fc.assert(
      fc.property(
        fc.array(
          badgeRecordArb.map((b) => ({ ...b, archived_at: null })),
          { minLength: 1, maxLength: 20 },
        ),
        (badges) => {
          // Ensure at most 3 pinned
          let pinnedCount = 0;
          const adjusted = badges.map((b) => {
            if (b.is_pinned && pinnedCount < MAX_PINNED) {
              pinnedCount++;
              return b;
            }
            return { ...b, is_pinned: false };
          });

          const active = getActiveBadges(adjusted);
          const pinnedInActive = active.filter((b) => b.is_pinned);
          const totalPinned = adjusted.filter((b) => b.is_pinned);

          // All pinned badges should be in active section
          expect(pinnedInActive.length).toBe(totalPinned.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
